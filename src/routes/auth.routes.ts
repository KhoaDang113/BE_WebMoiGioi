import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { RegisterRequestSchema } from "../dtos/auth/register.dto.js";
import { VerifyOTPRequestSchema } from "../dtos/auth/verify-otp.dto.js";
import { ResendOTPRequestSchema } from "../dtos/auth/resend-otp.dto.js";
import { LoginRequestSchema } from "../dtos/auth/login.dto.js";
import {
  GoogleLoginRequestSchema,
  FacebookLoginRequestSchema,
} from "../dtos/auth/social-login.dto.js";
import {
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
} from "../dtos/auth/forgot-password.dto.js";
import { Validator } from "../utils/validator.js";

const router = Router();
const authController = new AuthController();

// ─── Helper: trích xuất IP + UserAgent từ req ─────────────────────────────────
function extractReqMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

// ─── Helper: set auth cookies ─────────────────────────────────────────────────
function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken?: string,
) {
  res.cookie("accessToken", accessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: authController.accessExpireMs,
  });
  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: authController.refreshExpireMs,
    });
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = Validator.validate(RegisterRequestSchema, req.body);
      await authController.register(data);
      res.status(201).json({
        success: true,
        message: "Registration successful. Please check your email for OTP.",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/verify-otp",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp } = Validator.validate(
        VerifyOTPRequestSchema,
        req.body,
      );
      const result = await authController.verifyOTP(
        email,
        otp,
        extractReqMeta(req),
      );
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({
        success: true,
        message: "OTP verified successfully. User is now active.",
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/resend-otp",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = Validator.validate(ResendOTPRequestSchema, req.body);
      await authController.resendOTP(email);
      res
        .status(200)
        .json({ success: true, message: "New OTP sent to your email." });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = Validator.validate(LoginRequestSchema, req.body);
      const result = await authController.login(data, extractReqMeta(req));
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({ success: true, data: result.user });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/refresh-token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        res
          .status(401)
          .json({ success: false, message: "Refresh token not found" });
        return;
      }
      const result = await authController.refreshToken(
        refreshToken,
        extractReqMeta(req),
      );
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({ success: true, data: result.user });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/google",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = Validator.validate(
        GoogleLoginRequestSchema,
        req.body,
      );
      const result = await authController.googleLogin(
        idToken,
        extractReqMeta(req),
      );
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({ success: true, data: result.user });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/facebook",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken } = Validator.validate(
        FacebookLoginRequestSchema,
        req.body,
      );
      const result = await authController.facebookLogin(
        accessToken,
        extractReqMeta(req),
      );
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({ success: true, data: result.user });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/forgot-password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = Validator.validate(ForgotPasswordRequestSchema, req.body);
      await authController.forgotPassword(data);
      res.status(200).json({
        success: true,
        message: "Mã OTP đã được gửi đến email của bạn.",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/reset-password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = Validator.validate(ResetPasswordRequestSchema, req.body);
      await authController.resetPassword(data);
      res.status(200).json({
        success: true,
        message: "Mật khẩu đã được thiết lập lại thành công.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
