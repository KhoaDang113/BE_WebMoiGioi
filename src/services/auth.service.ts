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
    const saltRounds = 14; // As per RULE.md
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // 3. Create User (Pending Verification)
    // Note: We might want to use a transaction here, but for now we keep it simple as per plan.
    // If user creation fails, we just throw.
    // If OTP fails, we might have a user created but no OTP sent.
    // Ideally, we should wrap this in a transaction.
    // But since the UserRepo and OTPRepo use the main prisma client, we verify if they support transaction.
    // For now, let's proceed sequentially.

    // We create the user first.
    // Wait, if we create the user now, and OTP fails, checking 'exists' next time will fail.
    // But that's correct behavior. The user *exists*, just unverified.
    // Another approach: Don't create User yet, just store registration data in Redis/Temp table.
    // But the requirement says "Core Engine" usually implies direct DB usage.
    // Let's create the user with PENDING_VERIFICATION status.

    const user = await this.userRepository.create({
      email: data.email,
      phoneNumber: data.phone,
      passwordHash: passwordHash,
      accountType: AccountType.MEMBER,
      status: UserStatus.PENDING_VERIFICATION,
      // We need to provide required fields for UserProfile if needed, but it's nullable in schema?
      // UserProfile is optional (User -> profile: UserProfile?)
      // So we are good.
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
    // We send to email because phone SMS costs money and user asked for Nodemailer.
    // But the OTP is linked to phone number in DB. That's fine.
    await this.emailService.sendOTP(data.email, otpCode);
  }
}
