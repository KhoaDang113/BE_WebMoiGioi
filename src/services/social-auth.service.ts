import { OAuth2Client } from "google-auth-library";
import ms from "ms";
import { UserRepository } from "../repositories/user.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { SocialIdentityRepository } from "../repositories/socialIdentity.repository.js";
import * as TokenService from "./token.service.js";
import { AccountType, SocialProvider, UserStatus } from "../generated/client/client.js";
import { GOOGLE_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET } from "../contants/socialConstants.js";
import { JWT_REFRESH_EXPIRE } from "../contants/jwtContants.js";
import { AppError } from "../utils/customErrors.js";
import type { LoginResponseDTO } from "../dtos/auth/login.dto.js";
import type { SocialUserInfo } from "../types/social-infor.js";

export class SocialAuthService {
  private readonly userRepository: UserRepository;
  private readonly sessionRepository: SessionRepository;
  private readonly socialIdentityRepository: SocialIdentityRepository;
  private readonly googleClient: OAuth2Client;

  constructor(
    userRepository: UserRepository = new UserRepository(),
    sessionRepository: SessionRepository = new SessionRepository(),
    socialIdentityRepository: SocialIdentityRepository = new SocialIdentityRepository(),
  ) {
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.socialIdentityRepository = socialIdentityRepository;
    this.googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  }

  async loginWithGoogle(
    idToken: string,
    reqData: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponseDTO> {
    // 1. Verify Google ID token
    const userInfo = await this.verifyGoogleToken(idToken);

    // 2. Process social login
    return this.processSocialLogin(SocialProvider.GOOGLE, userInfo, reqData);
  }

  async loginWithFacebook(
    accessToken: string,
    reqData: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponseDTO> {
    // 1. Verify Facebook access token
    const userInfo = await this.verifyFacebookToken(accessToken);

    // 2. Process social login
    return this.processSocialLogin(SocialProvider.FACEBOOK, userInfo, reqData);
  }

  private async verifyGoogleToken(idToken: string): Promise<SocialUserInfo> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        throw new AppError("Invalid Google token", 401, "INVALID_GOOGLE_TOKEN");
      }

      return {
        providerUserId: payload.sub,
        email: payload.email ?? null,
        name: payload.name ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to verify Google token", 401, "INVALID_GOOGLE_TOKEN");
    }
  }

  private async verifyFacebookToken(accessToken: string): Promise<SocialUserInfo> {
    try {
      // Verify token with Facebook Graph API
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,email,name&access_token=${accessToken}`,
      );

      if (!response.ok) {
        throw new AppError("Invalid Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
      }

      const data = (await response.json()) as {
        id?: string;
        email?: string;
        name?: string;
      };

      if (!data.id) {
        throw new AppError("Invalid Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
      }

      return {
        providerUserId: data.id,
        email: data.email ?? null,
        name: data.name ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to verify Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
    }
  }

  private async processSocialLogin(
    provider: SocialProvider,
    userInfo: SocialUserInfo,
    reqData: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponseDTO> {
    // 1. Check if social identity already exists
    const existingIdentity = await this.socialIdentityRepository.findByProviderAndUserId(
      provider,
      userInfo.providerUserId,
    );

    let userId: bigint;

    if (existingIdentity) {
      // User already linked with this social provider → update lastLoginAt
      userId = existingIdentity.userId;
      await this.socialIdentityRepository.updateLastLogin(existingIdentity.id);
    } else {
      // New social login — check if email-based user exists
      let existingUser = userInfo.email
        ? await this.userRepository.findByEmail(userInfo.email)
        : null;

      if (existingUser) {
        // Link social identity to existing user
        userId = existingUser.id;
      } else {
        // Create new user
        const newUser = await this.userRepository.createSocialUser({
          email: userInfo.email,
          accountType: AccountType.MEMBER,
        });
        userId = newUser.id;
      }

      // Create social identity link
      await this.socialIdentityRepository.create({
        userId,
        provider,
        providerUserId: userInfo.providerUserId,
        email: userInfo.email,
        name: userInfo.name,
      });
    }

    // 2. Fetch the user for response
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // 3. Check user status
    if (user.status === UserStatus.BANNED || user.status === UserStatus.LOCKED) {
      throw new AppError(`Account is ${user.status.toLowerCase()}`, 403, "USER_LOCKED");
    }

    // 4. Create session and issue tokens
    const refreshExpireMs = ms(JWT_REFRESH_EXPIRE as ms.StringValue);
    const expiresAt = new Date(Date.now() + refreshExpireMs);

    await this.sessionRepository.enforceMaxSessions(userId, 5);

    const session = await this.sessionRepository.createSession(
      userId,
      expiresAt,
      reqData.ipAddress,
      reqData.userAgent,
    );

    const accessToken = TokenService.generateAccessToken({
      userId: user.id.toString(),
      accountType: user.accountType,
    });

    const refreshToken = TokenService.generateRefreshToken({
      userId: user.id.toString(),
      accountType: user.accountType,
      sessionId: session.id,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        phone: user.phoneNumber,
        accountType: user.accountType,
        status: user.status,
      },
    };
  }
}
