import { Router } from "express";
import { ChatController } from "../controllers/chat.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { uploadChatFile } from "../middlewares/upload.middleware.js";

const router = Router();
const chatController = new ChatController();

router.use(authMiddleware as any);

router.get("/conversations", chatController.handleGetMyConversations);
router.post("/conversation", chatController.handleGetOrCreateConversation);
router.post(
  "/conversations/:conversationId/file",
  uploadChatFile.single("file"),
  chatController.handleSendFile,
);

export default router;
