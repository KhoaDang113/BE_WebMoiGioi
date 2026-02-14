
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/customErrors.js";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

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
