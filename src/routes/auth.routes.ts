
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/verify-otp", authController.verify);
router.post("/resend-otp", authController.resend);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/google", authController.googleLogin);
router.post("/facebook", authController.facebookLogin);

export default router;
