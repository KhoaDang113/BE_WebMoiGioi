import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import InitSocket from "./sockets/index.js";

// Extend BigInt to support JSON serialization (Prisma requirement)
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};

//import routes
// import { connectDB } from "./config/database.js";

const app = express();
const server = createServer(app);

//middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "*"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(morgan("common"));

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "*"],
    methods: ["GET", "POST"],
  },
});

new InitSocket(io);

//connect Database
// connectDB();

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import locationRoutes from "./routes/location.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import reportRoutes from "./routes/report.routes.js";
import projectRoutes from "./routes/project.routes.js";

import { errorHandler } from "./middlewares/error.middleware.js";

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/listings", listingRoutes);
app.use("/api/v2", locationRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/projects", projectRoutes);

// Error Handler (Must be last)
app.use(errorHandler);

//listen port
const PORT = Number(process.env.PORT) || 3000;

server.listen(PORT, (): void => {
  console.log(`Server & Socket listening on port ${PORT}`);
});
