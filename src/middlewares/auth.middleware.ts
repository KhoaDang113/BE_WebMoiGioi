import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/customErrors.js";
import { verifyAccessToken } from "../services/token.service.js";
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    try {
        const decodedToken = verifyAccessToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError){
            throw new AppError("Token expired", 401, "TOKEN_EXPIRED");
        }
        throw new AppError("Invalid token", 401, "INVALID_TOKEN");
    }
}
