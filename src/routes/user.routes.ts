import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { AccountType } from "@prisma/client";
import { Validator } from "../utils/validator.js";
import { UpdateProfileRequestSchema } from "../dtos/user/update-profile.dto.js";
import { ChangePasswordRequestSchema } from "../dtos/user/change-password.dto.js";
import { SetPasswordSchema } from "../dtos/user/set-password.dto.js";

const router = Router();
const userController = new UserController();

router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await userController.getUser(req.user!.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/profile",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await userController.getProfile(req.user!.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/profile",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(
        UpdateProfileRequestSchema,
        req.body,
      );
      const profile = await userController.updateProfile(
        req.user!.userId,
        validatedData,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Profile updated successfully",
          data: profile,
        });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
      }
      const data = await userController.uploadAvatar(
        req.user!.userId,
        file.buffer,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Avatar uploaded and profile updated successfully",
          data,
        });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/change-password",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(
        ChangePasswordRequestSchema,
        req.body,
      );
      await userController.changePassword(req.user!.userId, validatedData);
      res
        .status(200)
        .json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/register-broker",
  authMiddleware,
  upload.fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "brokerLicense", maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;
      const updated = await userController.registerBroker(
        req.user!.userId,
        req.body,
        {
          idFront: files?.["idFront"],
          idBack: files?.["idBack"],
          brokerLicense: files?.["brokerLicense"],
        },
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Yêu cầu đăng ký đã được gửi",
          data: updated,
        });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/pending-brokers",
  authMiddleware,
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await userController.getPendingBrokers();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/user-count",
  authMiddleware,
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await userController.getDashboardUserCount();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/approve-broker/:id",
  authMiddleware,
  authorize(AccountType.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { approve } = req.body;
      if (!id) throw new Error("ID is required");
      const result = await userController.approveBroker(id, approve);
      res
        .status(200)
        .json({
          success: true,
          message: approve ? "Đã duyệt nhân viên" : "Đã từ chối",
          data: result,
        });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/initiate-set-password",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await userController.initiateSetPassword(req.user!.userId);
      res
        .status(200)
        .json({
          success: true,
          message: "Mã xác nhận đã được gửi về Gmail của bạn",
        });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/set-password",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = Validator.validate(SetPasswordSchema, req.body);
      await userController.setPasswordWithOTP(req.user!.userId, validatedData);
      res
        .status(200)
        .json({ success: true, message: "Đặt mật khẩu thành công!" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
