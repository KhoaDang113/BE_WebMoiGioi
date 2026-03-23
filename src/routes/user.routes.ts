import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { AccountType } from "../generated/client/client.js";

const router = Router();
const userController = new UserController();

router.get("/", authMiddleware, userController.getUser);
router.get("/profile", authMiddleware, userController.getProfile);
router.patch("/profile", authMiddleware, userController.updateProfile);
router.patch("/avatar", authMiddleware, upload.single("avatar"), userController.uploadAvatar);
router.patch("/change-password", authMiddleware, userController.changePassword);
router.post("/register-broker", authMiddleware, upload.fields([{ name: 'idFront', maxCount: 1 }, { name: 'idBack', maxCount: 1 }, { name: 'brokerLicense', maxCount: 1 }]), userController.registerBroker);
router.get("/admin/pending-brokers", authMiddleware, authorize(AccountType.ADMIN, AccountType.MODERATOR), userController.getPendingBrokers);
router.patch("/admin/approve-broker/:id", authMiddleware, authorize(AccountType.ADMIN, AccountType.MODERATOR), userController.approveBroker);
router.post("/initiate-set-password", authMiddleware, userController.initiateSetPassword);
router.post("/set-password", authMiddleware, userController.setPassword);

export default router;