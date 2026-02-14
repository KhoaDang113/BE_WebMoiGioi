import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { RegisterRequestSchema } from "../dtos/auth/register.dto.js";
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
}
