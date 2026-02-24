import bcrypt from "bcrypt";
import type { RegisterRequestDTO } from "../dtos/auth/register.dto.js";
import { UserRepository } from "../repositories/user.repository.js";
import { OTPRepository } from "../repositories/otp.repository.js";
import { EmailService } from "./email.service.js";
import {
  AccountType,
  OTPType,
  UserStatus,
} from "../generated/client/client.js";

// Custom Error Class (This should ideally be in a utils/errors file)
import { AppError } from "../utils/customErrors.js";

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly otpRepository: OTPRepository;
  private readonly emailService: EmailService;

  constructor(
    userRepository: UserRepository = new UserRepository(),
    otpRepository: OTPRepository = new OTPRepository(),
    emailService: EmailService = new EmailService(),
  ) {
    this.userRepository = userRepository;
    this.otpRepository = otpRepository;
    this.emailService = emailService;
  }

  async register(data: RegisterRequestDTO): Promise<void> {
    // 1. Check if user exists
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new AppError("Email already in use", 409, "EMAIL_EXISTS");
    }

    const existingPhone = await this.userRepository.findByPhone(data.phone);
    if (existingPhone) {
      throw new AppError("Phone number already in use", 409, "PHONE_EXISTS");
    }

    // 2. Hash Password
    const saltRounds = 14;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // 3. Create User (Pending Verification)
    const user = await this.userRepository.create({
      email: data.email,
      phoneNumber: data.phone,
      passwordHash: passwordHash,
      accountType: AccountType.MEMBER,
      status: UserStatus.PENDING_VERIFICATION,
    });

    // 4. Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.otpRepository.createOTP(
      data.phone,
      otpCode,
      OTPType.REGISTER,
      expiresAt,
    );

    // 5. Send Email
    await this.emailService.sendOTP(data.email, otpCode);
  }

  async verifyOTP(email: string, code: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new AppError("User already verified", 400, "USER_ALREADY_VERIFIED");
    }

    const otp = await this.otpRepository.findValidOTP(
      user.phoneNumber!,
      OTPType.REGISTER,
    );

    if (!otp) {
      throw new AppError("OTP has expired", 400, "OTP_EXPIRED");
    }

    if (otp.code !== code) {
      throw new AppError("Invalid OTP", 400, "INVALID_OTP");
    }

    await this.otpRepository.deleteOTP(otp.id);
    await this.userRepository.updateStatus(user.id, UserStatus.ACTIVE);
  }

  async resendOTP(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new AppError("User already verified", 400, "USER_ALREADY_VERIFIED");
    }

    const latestOTP = await this.otpRepository.findLatestOTP(
      user.phoneNumber!,
      OTPType.REGISTER,
    );

    if (latestOTP) {
      const now = new Date();
      const timeDiff = now.getTime() - latestOTP.createdAt.getTime();
      const cooldown = 60 * 1000; // 60 seconds

      if (timeDiff < cooldown) {
        const remainingTime = Math.ceil((cooldown - timeDiff) / 1000);
        throw new AppError(
          `Please wait ${remainingTime} seconds before requesting a new OTP`,
          429,
          // Custom error code for cooldown needed? Using generated/client might not have it.
          // Keeping string for now or use "OTP_COOLDOWN" if we define it.
          "OTP_COOLDOWN",
        );
      }
      
      // Delete old OTP if cooldown passed
      await this.otpRepository.deleteOTP(latestOTP.id);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.otpRepository.createOTP(
      user.phoneNumber!,
      otpCode,
      OTPType.REGISTER,
      expiresAt,
    );

    await this.emailService.sendOTP(user.email!, otpCode);
  }
}
