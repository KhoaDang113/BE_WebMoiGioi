import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { RegisterRequestSchema } from "../dtos/auth/register.dto.js";
import { VerifyOTPRequestSchema } from "../dtos/auth/verify-otp.dto.js";
import { ResendOTPRequestSchema } from "../dtos/auth/resend-otp.dto.js";
import { Validator } from "../utils/validator.js";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
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
      await this.authService.verifyOTP(email, otp);

      res.status(200).json({
        success: true,
        message: "OTP verified successfully. User is now active.",
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
}
