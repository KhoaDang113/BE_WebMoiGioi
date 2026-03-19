import type { NextFunction, Request, Response } from "express";
import { UserService } from "../services/user.service.js";
import { UploadService } from "../services/upload.service.js";
import { Validator } from "../utils/validator.js";
import { UpdateProfileRequestSchema } from "../dtos/user/update-profile.dto.js";
import { ChangePasswordRequestSchema } from "../dtos/user/change-password.dto.js";
import { SetPasswordSchema } from "../dtos/user/set-password.dto.js";

export class UserController {
  private userService: UserService;
  private uploadService: UploadService;

  constructor() {
    this.userService = new UserService();
    this.uploadService = new UploadService();
  }

  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getUser(req.user!.userId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.userService.getProfile(req.user!.userId);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(UpdateProfileRequestSchema, req.body);
      const profile = await this.userService.updateProfile(req.user!.userId, validatedData);
      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
      }

      // 1. Upload to Cloudinary
      const avatarUrl = await this.uploadService.uploadImage(file.buffer, "avatars");

      // 2. Update DB
      const profile = await this.userService.updateProfile(req.user!.userId, { avatarUrl });

      res.status(200).json({
        success: true,
        message: "Avatar uploaded and profile updated successfully",
        data: {
          avatarUrl,
          profile,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(ChangePasswordRequestSchema, req.body);
      await this.userService.changePassword(req.user!.userId, validatedData);
      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  initiateSetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.userService.initiateSetPassword(req.user!.userId);
      res.status(200).json({
        success: true,
        message: "Mã xác nhận đã được gửi về Gmail của bạn",
      });
    } catch (error) {
      next(error);
    }
  };

  setPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(SetPasswordSchema, req.body);
      await this.userService.setPasswordWithOTP(req.user!.userId, validatedData);
      res.status(200).json({
        success: true,
        message: "Đặt mật khẩu thành công!",
      });
    } catch (error) {
      next(error);
    }
  };
}

