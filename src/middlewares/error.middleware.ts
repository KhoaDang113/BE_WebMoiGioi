
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/customErrors.js";
import fs from "fs";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    fs.appendFileSync("e:\\Ngôn Ngữ PT\\đồ án\\BE_WebMoiGioi\\error_log.txt", `${new Date().toISOString()} - ${err.stack}\n`);
  } catch (e) {}

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      errorCode: err.errorCode,
      message: err.message,
    });
    return;
  }

  // Handle SyntaxError (JSON parse error)
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
        success: false,
        errorCode: "INVALID_JSON",
        message: "Invalid JSON format",
    });
    return;
  }


  // Default to 500 Internal Server Error
  res.status(500).json({
    success: false,
    errorCode: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
  });
};
