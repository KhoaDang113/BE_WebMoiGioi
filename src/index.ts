import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
dotenv.config();

//import routes
// import { connectDB } from "./config/database.js";

const app = express();

//middlewares
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(morgan("common"));

//connect Database
// connectDB();

import authRoutes from "./routes/auth.routes.js";

import { errorHandler } from "./middlewares/error.middleware.js";

//routes
app.use("/api/v1/auth", authRoutes);

// Error Handler (Must be last)
app.use(errorHandler);

//listen port
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, (): void => {
  console.log(`Server listening on port ${PORT}`);
});
