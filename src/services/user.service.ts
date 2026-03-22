import bcrypt from "bcrypt";
import { UserRepository } from "../repositories/user.repository.js";
import { OTPRepository } from "../repositories/otp.repository.js";
import { EmailService } from "./email.service.js";
import { AppError } from "../utils/customErrors.js";
import type { UpdateProfileRequestDTO } from "../dtos/user/update-profile.dto.js";
import type { ChangePasswordRequestDTO } from "../dtos/user/change-password.dto.ts";
import { OTPType } from "../generated/client/client.js";
import type { SetPasswordDTO } from "../dtos/user/set-password.dto.js";

export class UserService {
  private userRepo: UserRepository;
  private otpRepo: OTPRepository;
  private emailService: EmailService;

  constructor() {
    this.userRepo = new UserRepository();
    this.otpRepo = new OTPRepository();
    this.emailService = new EmailService();
  }

  async getUser(userID: string) {
    const user = await this.userRepo.findById(BigInt(userID));
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    return user;
  }

  async getProfile(userID: string) {
    const userId = BigInt(userID);

    const [user, profile, passwordHash] = await Promise.all([
      this.userRepo.findById(userId),
      this.userRepo.findProfileByUserId(userId),
      this.userRepo.findPasswordHashById(userId),
    ]);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return { 
      ...user, 
      profile,
      hasPassword: !!passwordHash, // Để FE biết có cần set MK hay không
    };
  }

  async updateProfile(userID: string, data: UpdateProfileRequestDTO) {
    const userId = BigInt(userID);

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const updateData: Parameters<typeof this.userRepo.updateProfile>[1] = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.taxCode !== undefined) updateData.taxCode = data.taxCode;
    if (data.identityCardNumber !== undefined) updateData.identityCardNumber = data.identityCardNumber;
    if (data.brokerLicenseNumber !== undefined) updateData.brokerLicenseNumber = data.brokerLicenseNumber;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
    if (data.socialLinks !== undefined) updateData.socialLinks = data.socialLinks;
    if (data.zaloContactPhone !== undefined) updateData.zaloContactPhone = data.zaloContactPhone;

    const profile = await this.userRepo.updateProfile(userId, updateData);

    return profile;
  }


  async changePassword(userID: string, data: ChangePasswordRequestDTO) {
    const userId = BigInt(userID);

    const currentHash = await this.userRepo.findPasswordHashById(userId);

    if (!currentHash) {
      throw new AppError(
        "Tài khoản đăng nhập qua mạng xã hội, vui lòng dùng chức năng 'Thiết lập mật khẩu'.",
        400,
        "NO_PASSWORD_SET",
      );
    }

    const isMatch = await bcrypt.compare(data.currentPassword, currentHash);
    if (!isMatch) {
      throw new AppError(
        "Mật khẩu hiện tại không chính xác",
        401,
        "WRONG_CURRENT_PASSWORD",
      );
    }

    const saltRounds = 14;
    const newHash = await bcrypt.hash(data.newPassword, saltRounds);
    await this.userRepo.updatePassword(userId, newHash);
  }

  async initiateSetPassword(userID: string) {
    const userId = BigInt(userID);
    const user = await this.userRepo.findById(userId);
    if (!user || !user.email) {
      throw new AppError("Email không khả dụng cho tài khoản này", 400, "EMAIL_NOT_FOUND");
    }

    const passwordHash = await this.userRepo.findPasswordHashById(userId);
    if (passwordHash) {
      throw new AppError("Tài khoản đã có mật khẩu, vui lòng dùng 'Đổi mật khẩu'", 400, "PASSWORD_ALREADY_SET");
    }

    // 1. Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.otpRepo.createOTP(OTPType.SET_PASSWORD, otpCode, expiresAt, undefined, user.email);

    // 2. Send email
    await this.emailService.sendOTP(user.email, otpCode);
  }

  async setPasswordWithOTP(userID: string, data: SetPasswordDTO) {
    const userId = BigInt(userID);
    const user = await this.userRepo.findById(userId);
    if (!user || !user.email) {
      throw new AppError("Email không khả dụng", 400, "EMAIL_NOT_FOUND");
    }

    // Verify OTP
    const otp = await this.otpRepo.findValidOTP(OTPType.SET_PASSWORD, undefined, user.email);
    if (!otp || otp.code !== data.otp) {
      throw new AppError("Mã xác nhận không hợp lệ hoặc đã hết hạn", 400, "INVALID_OTP");
    }

    // Mark OTP as used
    await this.otpRepo.markAsUsed(otp.id);

    // Hash & Save Password
    const saltRounds = 14;
    const newHash = await bcrypt.hash(data.newPassword, saltRounds);
    await this.userRepo.updatePassword(userId, newHash);
  }

  async registerBroker(userID: string, data: any, files: { idFront?: Express.Multer.File[] | undefined, idBack?: Express.Multer.File[] | undefined, brokerLicense?: Express.Multer.File[] | undefined }, uploadService: any) {
    const userId = BigInt(userID);
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const profile = await this.userRepo.findProfileByUserId(userId);
    const updateData: any = {
        displayName: data.fullName,
        zaloContactPhone: data.phoneNumber,
        identityCardNumber: data.identityCardNumber || "CCCD",
        bio: `Kinh nghiệm: ${data.experienceYears} năm. Khu vực: ${data.specializedArea}`,
    };

    let socialLinks = (profile?.socialLinks as any) || {};
    if (typeof socialLinks === 'string') socialLinks = JSON.parse(socialLinks);

    // Upload files to Cloudinary if provided
    if (files.idFront?.[0]) {
        socialLinks.idFrontUrl = await uploadService.uploadImage(files.idFront[0].buffer, { folder: "broker_id_cards" });
    }
    if (files.idBack?.[0]) {
        socialLinks.idBackUrl = await uploadService.uploadImage(files.idBack[0].buffer, { folder: "broker_id_cards" });
    }
    if (files.brokerLicense?.[0]) {
        socialLinks.brokerLicenseUrl = await uploadService.uploadImage(files.brokerLicense[0].buffer, { folder: "broker_licenses" });
    }

    updateData.socialLinks = socialLinks;
    
    await this.userRepo.updateProfile(userId, updateData);
    
    // Set user condition into pending verification representing broker upgrade
    return this.userRepo.updateUser(userId, { status: "PENDING_VERIFICATION" as any });
  }

  async getPendingBrokers() {
    return this.userRepo.findManyWithProfile({
        where: { status: "PENDING_VERIFICATION" },
        include: { profile: true }
    });
  }

  async approveBroker(brokerId: string, approve: boolean) {
    const userId = BigInt(brokerId);
    if (approve) {
        return this.userRepo.updateUser(userId, { status: "ACTIVE", accountType: "AGENT" });
    } else {
        // Reject - fallback to member active
        return this.userRepo.updateUser(userId, { status: "ACTIVE" });
    }
  }
}

