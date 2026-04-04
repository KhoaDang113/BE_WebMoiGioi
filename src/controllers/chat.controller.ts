import { AppError } from "../utils/customErrors.js";
import { UploadService } from "../services/upload.service.js";
import { userSockets, io } from "../sockets/index.js";
import prisma from "../config/database.js";

export class ChatController {
  private readonly uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  // ─── Get Or Create Conversation ───────────────────────────────────────────────

  async getOrCreateConversation(userId: string, listingId: string) {
    const buyerId = BigInt(userId);
    const listingIdBig = BigInt(listingId);

    const listing = await prisma.listing.findUnique({
      where: { id: listingIdBig },
      select: { userId: true },
    });

    if (!listing)
      throw new AppError("Tin đăng không tồn tại", 404, "LISTING_NOT_FOUND");

    const sellerId = listing.userId;
    if (buyerId === sellerId)
      throw new AppError(
        "Bạn không thể chat với chính mình",
        400,
        "CANNOT_CHAT_WITH_SELF",
      );

    let conversation = await prisma.conversation.findFirst({
      where: { buyerId, sellerId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        buyer: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        seller: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { listingId: listingIdBig, buyerId, sellerId },
        include: {
          messages: true,
          buyer: {
            select: {
              id: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
          seller: {
            select: {
              id: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
      });
    }

    // Force join socket room
    const userSocketsArray = userSockets.get(userId);
    if (userSocketsArray) {
      userSocketsArray.forEach((socket) => {
        socket.join(conversation!.id);
        console.log(
          `API forced user ${userId} to join room: ${conversation!.id}`,
        );
      });
    }

    return conversation;
  }

  // ─── Get My Conversations ─────────────────────────────────────────────────────

  async getMyConversations(userId: string) {
    const id = BigInt(userId);
    return prisma.conversation.findMany({
      where: { OR: [{ buyerId: id }, { sellerId: id }] },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        buyer: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });
  }

  // ─── Get Conversation By Id ─────────────────────────────────────────────────────

  async getConversationById(conversationId: string, userId: string) {
    const id = BigInt(userId);
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        buyer: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!conversation) {
      throw new AppError("Cuộc trò chuyện không tồn tại", 404, "CONVERSATION_NOT_FOUND");
    }

    if (conversation.buyerId !== id && conversation.sellerId !== id) {
      throw new AppError("Bạn không có quyền xem cuộc trò chuyện này", 403, "FORBIDDEN");
    }

    return conversation;
  }

  // ─── Send File Message ────────────────────────────────────────────────────────

  async sendFileMessage(
    conversationId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const senderId = BigInt(userId);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation)
      throw new AppError(
        "Cuộc trò chuyện không tồn tại",
        404,
        "CONVERSATION_NOT_FOUND",
      );

    const isMember =
      conversation.buyerId === senderId || conversation.sellerId === senderId;
    if (!isMember)
      throw new AppError(
        "Bạn không có quyền gửi vào cuộc trò chuyện này",
        403,
        "FORBIDDEN",
      );

    const fileUrl = await this.uploadService.uploadFile(
      file.buffer,
      file.originalname,
      {
        folder: "chat_files",
      },
    );

    const message = await prisma.message.create({
      data: { conversationId, senderId, content: fileUrl, type: "IMAGE" },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: "[File đính kèm]", lastMessageAt: new Date() },
    });

    // Broadcast to socket room
    if (io) {
      io.to(conversationId).emit("receive_message", {
        senderId: userId,
        message: fileUrl,
        timestamp: new Date(),
      });
    }

    return { message, fileUrl };
  }
}
