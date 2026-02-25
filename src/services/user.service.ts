import { UserRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/customErrors.js";

export class UserService {
    private userRepo: UserRepository
    constructor() {
        this.userRepo = new UserRepository()
    }

    async getUser(userID: string) {
        const user = await this.userRepo.findById(BigInt(userID));
        if (!user) {
            throw new AppError("User not found", 404, "USER_NOT_FOUND");
        }
        return user;
    }    
}
