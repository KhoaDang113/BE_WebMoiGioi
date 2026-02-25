import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { SocialAuthService } from "../services/social-auth.service.js";
import { RegisterRequestSchema } from "../dtos/auth/register.dto.js";
import { VerifyOTPRequestSchema } from "../dtos/auth/verify-otp.dto.js";
import { ResendOTPRequestSchema } from "../dtos/auth/resend-otp.dto.js";
import { LoginRequestSchema, type LoginResponseDTO } from "../dtos/auth/login.dto.js";
import { GoogleLoginRequestSchema, FacebookLoginRequestSchema } from "../dtos/auth/social-login.dto.js";
import { Validator } from "../utils/validator.js";
import { JWT_ACCESS_EXPIRE, JWT_REFRESH_EXPIRE } from "../contants/jwtContants.js";
import ms from "ms";

export class AuthController {
  private authService: AuthService;
  private socialAuthService: SocialAuthService;
  private accessExpireMs = ms(JWT_ACCESS_EXPIRE as ms.StringValue);
  private refreshExpireMs = ms(JWT_REFRESH_EXPIRE as ms.StringValue);

  constructor() {
    this.authService = new AuthService();
    this.socialAuthService = new SocialAuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validation
      const validatedData = Validator.validate(RegisterRequestSchema, req.body);

      await this.authService.register(validatedData);

      res.status(201).json({
        success: true,
        message: "Registration successful. Please check your email for OTP.",
      });
    } catch (error) {
      next(error);
    }
  };

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(VerifyOTPRequestSchema, req.body);
      const { email, otp } = validatedData;

      const reqData: { ipAddress?: string; userAgent?: string } = {};
      if (req.ip) reqData.ipAddress = req.ip;
      if (req.headers["user-agent"]) reqData.userAgent = req.headers["user-agent"];

      const result = await this.authService.verifyOTP(email, otp, reqData);

      this.setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        message: "OTP verified successfully. User is now active.",
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  resend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(ResendOTPRequestSchema, req.body);
      const { email } = validatedData;
      await this.authService.resendOTP(email);

      res.status(200).json({
        success: true,
        message: "New OTP sent to your email.",
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(LoginRequestSchema, req.body);
      
      const reqData: { ipAddress?: string; userAgent?: string } = {};
      if (req.ip) reqData.ipAddress = req.ip;
      if (req.headers["user-agent"]) reqData.userAgent = req.headers["user-agent"];

      const result: LoginResponseDTO = await this.authService.login(validatedData, reqData);

      this.setCookies(res, result.accessToken, result.refreshToken);
      
      res.status(200).json({
        success: true,
        data: result.user, // Remove tokens from body since they are in cookies now
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, message: "Refresh token not found" });
        return;
      }

      const reqData: { ipAddress?: string; userAgent?: string } = {};
      if (req.ip) reqData.ipAddress = req.ip;
      if (req.headers["user-agent"]) reqData.userAgent = req.headers["user-agent"];

      const result = await this.authService.refreshToken(refreshToken, reqData);

      this.setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(GoogleLoginRequestSchema, req.body);

      const reqData: { ipAddress?: string; userAgent?: string } = {};
      if (req.ip) reqData.ipAddress = req.ip;
      if (req.headers["user-agent"]) reqData.userAgent = req.headers["user-agent"];

      const result = await this.socialAuthService.loginWithGoogle(validatedData.idToken, reqData);

      this.setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  facebookLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(FacebookLoginRequestSchema, req.body);

      const reqData: { ipAddress?: string; userAgent?: string } = {};
      if (req.ip) reqData.ipAddress = req.ip;
      if (req.headers["user-agent"]) reqData.userAgent = req.headers["user-agent"];

      const result = await this.socialAuthService.loginWithFacebook(validatedData.accessToken, reqData);

      this.setCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  private setCookies = (res: Response, accessToken: string, refreshToken?: string) => {
    res.cookie("accessToken", accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: this.accessExpireMs,
    });

    if (refreshToken) {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: this.refreshExpireMs,
      });
    }
  }
}
