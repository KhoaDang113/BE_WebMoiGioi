import type { Request, Response, NextFunction } from "express";
import { ChatService } from "../services/chat.service.js";
import { userSockets, io } from "../sockets/index.js";

export class ChatController {
  private readonly chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  public handleGetOrCreateConversation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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

      const conversation = await this.chatService.getOrCreateConversation(
        userId.toString(),
        listingId.toString(),
      );

      // Bắt buộc socket của user hiện tại join vào phòng chat vừa tạo
      const userSocketsArray = userSockets.get(userId.toString());
      if (userSocketsArray) {
        userSocketsArray.forEach((socket) => {
          socket.join(conversation.id);
          console.log(
            `API forced user ${userId} to join room: ${conversation.id}`,
          );
        });
      }

      res.status(200).json({
        success: true,
        message: "Lấy hoặc tạo hội thoại thành công",
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  };

  public handleGetMyConversations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const conversations = await this.chatService.getMyConversations(
        userId.toString(),
      );
      res.status(200).json({ success: true, data: conversations });
    } catch (error) {
      next(error);
    }
  };

  public handleSendFile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { conversationId } = req.params;
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

      const { message, fileUrl } = await this.chatService.sendFileMessage(
        conversationId as string,
        userId.toString(),
        file,
      );

      // Broadcast file message to all participants in the room
      if (io) {
        io.to(conversationId).emit("receive_message", {
          senderId: userId.toString(),
          message: fileUrl,
          timestamp: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: "Gửi file thành công",
        data: { message, fileUrl },
      });
    } catch (error) {
      next(error);
    }
  };
}
