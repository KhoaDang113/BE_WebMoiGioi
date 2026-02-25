

import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const userController = new UserController();

router.get("/", authMiddleware, userController.getUser);

export default router;