import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/customErrors.js";
import { AccountType } from "@prisma/client";

export const authorize = (...allowedRoles: AccountType[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            throw new AppError("Unauthorized: No user found in request", 401, "UNAUTHORIZED");
        }
        
        if (!allowedRoles.includes(user.accountType)) {
            throw new AppError("Forbidden: You do not have permission to access this resource", 403, "FORBIDDEN");
        }
        
        next();
    };
};
