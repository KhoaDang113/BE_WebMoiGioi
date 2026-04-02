import type { Conversation } from "generated/client/client.js";
import prisma from "../config/database.js";
import { AppError } from "../utils/customErrors.js";
import { UploadService } from "./upload.service.js";

const uploadService = new UploadService();

export class ChatService {
  async getOrCreateConversation(buyerIdStr: string, listingIdStr: string) {
    const buyerId = BigInt(buyerIdStr);
    const listingId = BigInt(listingIdStr);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true },
    });

    if (!listing) {
      throw new AppError("Tin đăng không tồn tại", 404, "LISTING_NOT_FOUND");
    }

    const sellerId = listing.userId;

    if (buyerId === sellerId) {
      throw new AppError(
        "Bạn không thể chat với chính mình",
        400,
        "CANNOT_CHAT_WITH_SELF",
      );
    }

    let conversation = await prisma.conversation.findFirst({
      where: { listingId, buyerId, sellerId },
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
        data: { listingId, buyerId, sellerId },
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

    return conversation;
  }

  async getMyConversations(userIdStr: string): Promise<Conversation[]> {
    const userId = BigInt(userIdStr);
    return prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
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

  /**
   * Upload file lên Cloudinary và lưu tin nhắn kiểu FILE vào DB
   */
  async sendFileMessage(
    conversationId: string,
    senderIdStr: string,
    file: Express.Multer.File,
  ) {
    const senderId = BigInt(senderIdStr);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new AppError(
        "Cuộc trò chuyện không tồn tại",
        404,
        "CONVERSATION_NOT_FOUND",
      );
    }

    const isMember =
      conversation.buyerId === senderId || conversation.sellerId === senderId;

    if (!isMember) {
      throw new AppError(
        "Bạn không có quyền gửi vào cuộc trò chuyện này",
        403,
        "FORBIDDEN",
      );
    }

    const fileUrl = await uploadService.uploadFile(
      file.buffer,
      file.originalname,
      { folder: "chat_files" },
    );

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: fileUrl,
        type: "IMAGE",
      },
    });

    // Update lastMessage on conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: "[File đính kèm]",
        lastMessageAt: new Date(),
      },
    });

    return { message, fileUrl };
  }
}
