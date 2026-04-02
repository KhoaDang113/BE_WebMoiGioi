import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/socket.type.js";
import { ChatHandler } from "./chat.socket.js";
import { verifyAccessToken } from "../services/token.service.js";
import { AppError } from "../utils/customErrors.js";
import jwt from "jsonwebtoken";

export const userSockets = new Map<string, Socket[]>();
export let io: Server;

class InitSocket {
  private readonly io: Server;
  constructor(_io: Server) {
    this.io = _io; // dùng trong đây có để type cho io
    io = _io; // dùng khai báo biến toàn cục cho các file khác dùng
    this.registerMiddleware();
    this.initialize();
  }

  private registerMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token as string;

      if (!token) {
        return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
      }

      try {
        const decodedToken = verifyAccessToken(token);
        socket.data.user = decodedToken;
        return next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return next(new AppError("Token expired", 401, "TOKEN_EXPIRED"));
        }
        return next(new AppError("Invalid token", 401, "INVALID_TOKEN"));
      }
    });
  }

  private initialize() {
    this.io.on(
      "connection",
      (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
        console.log(`User connected: ${socket.data.user?.userId}`);
        this.handleConnection(socket);
      },
    );
  }

  private handleConnection(socket: Socket) {
    const userId = socket.data.user?.userId?.toString();
    if (userId) {
      if (!userSockets.has(userId)) {
        userSockets.set(userId, []);
      }
      userSockets.get(userId)!.push(socket);
    }

    const chatHandler = new ChatHandler(this.io, socket);
    chatHandler.registerEvents(this.io, socket);
    socket.on("disconnect", () => {
      console.log(
        `User disconnected: ${socket.data.user?.userId ?? socket.id}`,
      );
      if (userId) {
        let sockets = userSockets.get(userId);
        if (sockets) {
          sockets = sockets.filter((s) => s.id !== socket.id);
          if (sockets.length === 0) {
            userSockets.delete(userId);
          } else {
            userSockets.set(userId, sockets);
          }
        }
      }
    });
  }
}

export default InitSocket;
