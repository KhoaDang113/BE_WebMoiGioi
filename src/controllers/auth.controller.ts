import bcrypt from "bcrypt";
import ms from "ms";
import { OAuth2Client } from "google-auth-library";
import { UserRepository } from "../repositories/user.repository.js";
import { OTPRepository } from "../repositories/otp.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { SocialIdentityRepository } from "../repositories/socialIdentity.repository.js";
import { EmailService } from "../services/email.service.js";
import * as TokenService from "../services/token.service.js";
import type { RegisterRequestDTO } from "../dtos/auth/register.dto.js";
import { RegisterRequestSchema } from "../dtos/auth/register.dto.js";
import { VerifyOTPRequestSchema } from "../dtos/auth/verify-otp.dto.js";
import { ResendOTPRequestSchema } from "../dtos/auth/resend-otp.dto.js";
import {
  LoginRequestSchema,
  type LoginResponseDTO,
} from "../dtos/auth/login.dto.js";
import {
  GoogleLoginRequestSchema,
  FacebookLoginRequestSchema,
} from "../dtos/auth/social-login.dto.js";
import type {
  ForgotPasswordRequestDTO,
  ResetPasswordRequestDTO,
} from "../dtos/auth/forgot-password.dto.js";
import { Validator } from "../utils/validator.js";
import { AppError } from "../utils/customErrors.js";
import {
  AccountType,
  OTPType,
  SocialProvider,
  UserStatus,
} from "@prisma/client";
import {
  JWT_REFRESH_EXPIRE,
  JWT_ACCESS_EXPIRE,
} from "../contants/jwtContants.js";
import {
  GOOGLE_CLIENT_ID,
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
} from "../contants/socialConstants.js";
import type { SocialUserInfo } from "../types/social-infor.js";

export class AuthController {
  private readonly userRepository: UserRepository;
  private readonly otpRepository: OTPRepository;
  private readonly sessionRepository: SessionRepository;
  private readonly socialIdentityRepository: SocialIdentityRepository;
  private readonly emailService: EmailService;
  private readonly googleClient: OAuth2Client;
  readonly accessExpireMs = ms(JWT_ACCESS_EXPIRE as ms.StringValue);
  readonly refreshExpireMs = ms(JWT_REFRESH_EXPIRE as ms.StringValue);

  constructor() {
    this.userRepository = new UserRepository();
    this.otpRepository = new OTPRepository();
    this.sessionRepository = new SessionRepository();
    this.socialIdentityRepository = new SocialIdentityRepository();
    this.emailService = new EmailService();
    this.googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  }

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(data: RegisterRequestDTO): Promise<void> {
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new AppError("Email already in use", 409, "EMAIL_EXISTS");
    }

    const existingPhone = await this.userRepository.findByPhone(data.phone);
    if (existingPhone) {
      throw new AppError("Phone number already in use", 409, "PHONE_EXISTS");
    }

    const saltRounds = 14;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    await this.userRepository.create({
      email: data.email,
      phoneNumber: data.phone,
      passwordHash,
      accountType: AccountType.MEMBER,
      status: UserStatus.PENDING_VERIFICATION,
    });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpRepository.createOTP(
      OTPType.REGISTER,
      otpCode,
      expiresAt,
      data.phone,
    );
    await this.emailService.sendOTP(data.email, otpCode);
  }

  // ─── Verify OTP ──────────────────────────────────────────────────────────────

  async verifyOTP(
    email: string,
    code: string,
    reqData: { ipAddress: string | undefined; userAgent: string | undefined },
  ): Promise<LoginResponseDTO> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.status === UserStatus.ACTIVE)
      throw new AppError("User already verified", 400, "USER_ALREADY_VERIFIED");

    const otp = await this.otpRepository.findValidOTP(
      OTPType.REGISTER,
      user.phoneNumber!,
    );
    if (!otp) throw new AppError("OTP has expired", 400, "OTP_EXPIRED");
    if (otp.code !== code)
      throw new AppError("Invalid OTP", 400, "INVALID_OTP");

    await this.otpRepository.deleteOTP(otp.id);
    await this.userRepository.updateStatus(user.id, UserStatus.ACTIVE);

    const expiresAt = new Date(Date.now() + this.refreshExpireMs);
    const session = await this.sessionRepository.createSession(
      user.id,
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
        status: UserStatus.ACTIVE,
      },
    };
  }

  // ─── Resend OTP ───────────────────────────────────────────────────────────────

  async resendOTP(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (user.status === UserStatus.ACTIVE)
      throw new AppError("User already verified", 400, "USER_ALREADY_VERIFIED");

    const latestOTP = await this.otpRepository.findLatestOTP(
      OTPType.REGISTER,
      user.phoneNumber!,
    );
    if (latestOTP) {
      const timeDiff = Date.now() - latestOTP.createdAt.getTime();
      const cooldown = 60 * 1000;
      if (timeDiff < cooldown) {
        const remainingTime = Math.ceil((cooldown - timeDiff) / 1000);
        throw new AppError(
          `Please wait ${remainingTime} seconds before requesting a new OTP`,
          429,
          "OTP_COOLDOWN",
        );
      }
      await this.otpRepository.deleteOTP(latestOTP.id);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.otpRepository.createOTP(
      OTPType.REGISTER,
      otpCode,
      expiresAt,
      user.phoneNumber!,
    );
    await this.emailService.sendOTP(user.email!, otpCode);
  }

  // ─── Login ────────────────────────────────────────────────────────────────────

  async login(
    data: { email: string; password: string },
    reqData: { ipAddress: string | undefined; userAgent: string | undefined },
  ): Promise<LoginResponseDTO> {
    const user = await this.userRepository.findAuthByEmail(data.email);
    if (!user || !user.passwordHash)
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");

    const isPasswordMatch = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );
    if (!isPasswordMatch)
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");

    if (user.status === UserStatus.PENDING_VERIFICATION)
      throw new AppError(
        "Please verify your account first",
        403,
        "USER_NOT_VERIFIED",
      );
    if (user.status === UserStatus.BANNED || user.status === UserStatus.LOCKED)
      throw new AppError(
        `Account is ${user.status.toLowerCase()}`,
        403,
        "USER_LOCKED",
      );

    const expiresAt = new Date(Date.now() + this.refreshExpireMs);
    await this.sessionRepository.enforceMaxSessions(user.id, 5);
    const session = await this.sessionRepository.createSession(
      user.id,
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

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  async refreshToken(
    refreshToken: string,
    reqData: { ipAddress: string | undefined; userAgent: string | undefined },
  ): Promise<LoginResponseDTO> {
    const decoded = TokenService.verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.sessionId)
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");

    const user = await this.userRepository.findById(BigInt(decoded.userId));
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const session = await this.sessionRepository.findSessionById(
      decoded.sessionId,
    );
    if (!session || session.isRevoked || session.expiresAt < new Date())
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");

    await this.sessionRepository.updateSessionActivity(session.id);

    const accessToken = TokenService.generateAccessToken({
      userId: user.id.toString(),
      accountType: user.accountType,
    });

    return {
      accessToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        phone: user.phoneNumber,
        accountType: user.accountType,
        status: user.status,
      },
    };
  }

  // ─── Google Login ─────────────────────────────────────────────────────────────

  async googleLogin(
    idToken: string,
    reqData: { ipAddress: string | undefined; userAgent: string | undefined },
  ): Promise<LoginResponseDTO> {
    const userInfo = await this.verifyGoogleToken(idToken);
    return this.processSocialLogin(SocialProvider.GOOGLE, userInfo, reqData);
  }

  // ─── Facebook Login ───────────────────────────────────────────────────────────

  async facebookLogin(
    accessToken: string,
    reqData: { ipAddress: string | undefined; userAgent: string | undefined },
  ): Promise<LoginResponseDTO> {
    const userInfo = await this.verifyFacebookToken(accessToken);
    return this.processSocialLogin(SocialProvider.FACEBOOK, userInfo, reqData);
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────────

  async forgotPassword(data: ForgotPasswordRequestDTO): Promise<void> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError(
        "Email không tồn tại trong hệ thống",
        404,
        "USER_NOT_FOUND",
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await this.otpRepository.createOTP(
      OTPType.FORGOT_PASSWORD,
      otpCode,
      expiresAt,
      undefined,
      data.email,
    );
    await this.emailService.sendOTP(data.email, otpCode);
  }

  // ─── Reset Password ───────────────────────────────────────────────────────────

  async resetPassword(data: ResetPasswordRequestDTO): Promise<void> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError(
        "Email không tồn tại trong hệ thống",
        404,
        "USER_NOT_FOUND",
      );
    }

    const otp = await this.otpRepository.findValidOTP(
      OTPType.FORGOT_PASSWORD,
      undefined,
      data.email,
    );

    if (!otp) {
      throw new AppError(
        "Mã OTP đã hết hạn hoặc không có yêu cầu nào",
        400,
        "OTP_EXPIRED",
      );
    }
    if (otp.code !== data.otp) {
      throw new AppError(
        "Mã định danh OTP không chính xác",
        400,
        "INVALID_OTP",
      );
    }

    await this.otpRepository.markAsUsed(otp.id);

    const saltRounds = 14;
    const passwordHash = await bcrypt.hash(data.newPassword, saltRounds);

    await this.userRepository.updatePassword(user.id, passwordHash);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async verifyGoogleToken(idToken: string): Promise<SocialUserInfo> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub)
        throw new AppError("Invalid Google token", 401, "INVALID_GOOGLE_TOKEN");
      return {
        providerUserId: payload.sub,
        email: payload.email ?? null,
        name: payload.name ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to verify Google token",
        401,
        "INVALID_GOOGLE_TOKEN",
      );
    }
  }

  private async verifyFacebookToken(
    accessToken: string,
  ): Promise<SocialUserInfo> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,email,name&access_token=${accessToken}`,
      );
      if (!response.ok)
        throw new AppError(
          "Invalid Facebook token",
          401,
          "INVALID_FACEBOOK_TOKEN",
        );
      const data = (await response.json()) as {
        id?: string;
        email?: string;
        name?: string;
      };
      if (!data.id)
        throw new AppError(
          "Invalid Facebook token",
          401,
          "INVALID_FACEBOOK_TOKEN",
        );
      return {
        providerUserId: data.id,
        email: data.email ?? null,
        name: data.name ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to verify Facebook token",
        401,
        "INVALID_FACEBOOK_TOKEN",
      );
    }
  }

  private async processSocialLogin(
    provider: SocialProvider,
    userInfo: SocialUserInfo,
    reqData: { ipAddress: string | undefined; userAgent: string | undefined },
  ): Promise<LoginResponseDTO> {
    const existingIdentity =
      await this.socialIdentityRepository.findByProviderAndUserId(
        provider,
        userInfo.providerUserId,
      );

    let userId: bigint;

    if (existingIdentity) {
      userId = existingIdentity.userId;
      await this.socialIdentityRepository.updateLastLogin(existingIdentity.id);
    } else {
      let existingUser = userInfo.email
        ? await this.userRepository.findByEmail(userInfo.email)
        : null;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const newUser = await this.userRepository.createSocialUser({
          email: userInfo.email,
          accountType: AccountType.MEMBER,
        });
        userId = newUser.id;
      }

      await this.socialIdentityRepository.create({
        userId,
        provider,
        providerUserId: userInfo.providerUserId,
        email: userInfo.email,
        name: userInfo.name,
      });
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    if (user.status === UserStatus.BANNED || user.status === UserStatus.LOCKED)
      throw new AppError(
        `Account is ${user.status.toLowerCase()}`,
        403,
        "USER_LOCKED",
      );

    const expiresAt = new Date(Date.now() + this.refreshExpireMs);
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
