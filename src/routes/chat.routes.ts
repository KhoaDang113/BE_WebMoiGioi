import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { ChatController } from "../controllers/chat.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { uploadChatFile } from "../middlewares/upload.middleware.js";
import { AppError } from "../utils/customErrors.js";

const router = Router();
const chatController = new ChatController();

router.use(authMiddleware as any);

router.get(
  "/conversations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const conversations = await chatController.getMyConversations(
        userId.toString(),
      );
      res.status(200).json({ success: true, data: conversations });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/conversation",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { listingId } = req.body;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      if (!listingId) {
        res.status(400).json({ success: false, message: "Thiếu listingId" });
        return;
      }
      const conversation = await chatController.getOrCreateConversation(
        userId.toString(),
        listingId.toString(),
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Lấy hoặc tạo hội thoại thành công",
          data: conversation,
        });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/conversations/:conversationId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const conversationId = req.params.conversationId as string;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      if (!conversationId) {
        res.status(400).json({ success: false, message: "Thiếu conversationId" });
        return;
      }
      const conversation = await chatController.getConversationById(
        conversationId,
        userId.toString(),
      );
      res.status(200).json({ success: true, data: conversation });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/conversations/:conversationId/file",
  uploadChatFile.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const conversationId = req.params.conversationId as string;
      const file = req.file;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      if (!conversationId) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu conversationId" });
        return;
      }
      if (!file) {
        res
          .status(400)
          .json({ success: false, message: "Không có file nào được gửi lên" });
        return;
      }
      const result = await chatController.sendFileMessage(
        conversationId,
        userId.toString(),
        file,
      );
      res
        .status(200)
        .json({ success: true, message: "Gửi file thành công", data: result });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
