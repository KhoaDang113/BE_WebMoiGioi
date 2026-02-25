import type { NextFunction, Request, Response } from "express";
import { UserService } from "../services/user.service.js";

export class UserController {
    private userService: UserService;
    constructor() {
        this.userService = new UserService();
    }

    getUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.userService.getUser(req.user!.userId);
            res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }   
}