import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = Router();
const userController = new UserController();

router.get("/", authMiddleware, userController.getUser);
router.get("/profile", authMiddleware, userController.getProfile);
router.patch("/profile", authMiddleware, userController.updateProfile);
router.patch("/avatar", authMiddleware, upload.single("avatar"), userController.uploadAvatar);
router.patch("/change-password", authMiddleware, userController.changePassword);
router.post("/initiate-set-password", authMiddleware, userController.initiateSetPassword);
router.post("/set-password", authMiddleware, userController.setPassword);

export default router;