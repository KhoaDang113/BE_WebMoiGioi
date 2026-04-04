import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/socket.type.js";
import prisma from "../config/database.js";

export class ChatHandler {
  private readonly io: Server;
  private readonly socket: Socket<ServerToClientEvents, ClientToServerEvents>;

  constructor(io: Server, socket: Socket) {
    this.io = io;
    this.socket = socket;
  }

  public registerEvents(io: Server, socket: Socket) {
    socket.on("join_room", (roomId: string) => this.handleJoinRoom(roomId));
    socket.on("leave_room", (roomId: string) => this.handleLeaveRoom(roomId));
    socket.on(
      "send_message",
      (data: {
        roomId: string;
        message: string;
        senderId: string;
        conversationId: string;
      }) => this.handleMessage(data),
    );
  }

  private handleJoinRoom(roomId: string) {
    this.socket.join(roomId);
    console.log(`User ${this.socket.id} đã tham gia phòng: ${roomId}`);
  }

  private handleLeaveRoom(roomId: string) {
    this.socket.leave(roomId);
    console.log(`User ${this.socket.id} đã rời phòng: ${roomId}`);
  }

  private async handleMessage(data: {
    roomId: string;
    message: string;
    senderId: string;
  }) {
    await prisma.message.create({
      data: {
        conversationId: data.roomId,
        senderId: BigInt(data.senderId),
        content: data.message,
      },
    });

    await prisma.conversation.update({
      where: {
        id: data.roomId,
      },
      data: {
        lastMessage: data.message,
        lastMessageAt: new Date(),
      },
    });

    this.io.to(data.roomId).emit("receive_message", {
      senderId: data.senderId,
      message: data.message,
      timestamp: new Date(),
      conversationId: data.roomId,
    });
    console.log("Gửi tin nhắn thành công");
  }
}
