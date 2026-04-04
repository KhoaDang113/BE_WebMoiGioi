import bcrypt from "bcrypt";
import prisma from "../config/database.js";
import { UserRepository } from "../repositories/user.repository.js";
import { OTPRepository } from "../repositories/otp.repository.js";
import { EmailService } from "../services/email.service.js";
import { UploadService } from "../services/upload.service.js";
import { AppError } from "../utils/customErrors.js";
import { OTPType } from "@prisma/client";
import type { UpdateProfileRequestDTO } from "../dtos/user/update-profile.dto.js";
import type { ChangePasswordRequestDTO } from "../dtos/user/change-password.dto.js";
import type { SetPasswordDTO } from "../dtos/user/set-password.dto.js";

export class UserController {
  private readonly userRepo: UserRepository;
  private readonly otpRepo: OTPRepository;
  private readonly emailService: EmailService;
  readonly uploadService: UploadService;

  constructor() {
    this.userRepo = new UserRepository();
    this.otpRepo = new OTPRepository();
    this.emailService = new EmailService();
    this.uploadService = new UploadService();
  }

  // ─── Get User ─────────────────────────────────────────────────────────────────

  async getUser(userId: string) {
    const user = await this.userRepo.findById(BigInt(userId));
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user;
  }

  // ─── Get Profile ──────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const id = BigInt(userId);
    const [user, profile, passwordHash] = await Promise.all([
      this.userRepo.findById(id),
      this.userRepo.findProfileByUserId(id),
      this.userRepo.findPasswordHashById(id),
    ]);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return { ...user, profile, hasPassword: !!passwordHash };
  }

  // ─── Update Profile ───────────────────────────────────────────────────────────

  async updateProfile(userId: string, data: UpdateProfileRequestDTO) {
    const id = BigInt(userId);
    const user = await this.userRepo.findById(id);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const updateData: Parameters<typeof this.userRepo.updateProfile>[1] = {};
    if (data.displayName !== undefined)
      updateData.displayName = data.displayName;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.taxCode !== undefined) updateData.taxCode = data.taxCode;
    if (data.identityCardNumber !== undefined)
      updateData.identityCardNumber = data.identityCardNumber;
    if (data.brokerLicenseNumber !== undefined)
      updateData.brokerLicenseNumber = data.brokerLicenseNumber;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
    if (data.socialLinks !== undefined)
      updateData.socialLinks = data.socialLinks;
    if (data.zaloContactPhone !== undefined)
      updateData.zaloContactPhone = data.zaloContactPhone;

    return this.userRepo.updateProfile(id, updateData);
  }

  // ─── Upload Avatar ────────────────────────────────────────────────────────────

  async uploadAvatar(userId: string, fileBuffer: Buffer) {
    const avatarUrl = await this.uploadService.uploadImage(fileBuffer, {
      folder: "avatars",
      transformation: [{ width: 250, height: 250, crop: "limit" }],
    });
    const profile = await this.updateProfile(userId, { avatarUrl });
    return { avatarUrl, profile };
  }

  // ─── Change Password ──────────────────────────────────────────────────────────

  async changePassword(userId: string, data: ChangePasswordRequestDTO) {
    const id = BigInt(userId);
    const currentHash = await this.userRepo.findPasswordHashById(id);
    if (!currentHash) {
      throw new AppError(
        "Tài khoản đăng nhập qua mạng xã hội, vui lòng dùng chức năng 'Thiết lập mật khẩu'.",
        400,
        "NO_PASSWORD_SET",
      );
    }

    const isMatch = await bcrypt.compare(data.currentPassword, currentHash);
    if (!isMatch)
      throw new AppError(
        "Mật khẩu hiện tại không chính xác",
        401,
        "WRONG_CURRENT_PASSWORD",
      );

    const newHash = await bcrypt.hash(data.newPassword, 14);
    await this.userRepo.updatePassword(id, newHash);
  }

  // ─── Initiate Set Password ────────────────────────────────────────────────────

  async initiateSetPassword(userId: string) {
    const id = BigInt(userId);
    const user = await this.userRepo.findById(id);
    if (!user || !user.email)
      throw new AppError(
        "Email không khả dụng cho tài khoản này",
        400,
        "EMAIL_NOT_FOUND",
      );

    const passwordHash = await this.userRepo.findPasswordHashById(id);
    if (passwordHash)
      throw new AppError(
        "Tài khoản đã có mật khẩu, vui lòng dùng 'Đổi mật khẩu'",
        400,
        "PASSWORD_ALREADY_SET",
      );

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.otpRepo.createOTP(
      OTPType.SET_PASSWORD,
      otpCode,
      expiresAt,
      undefined,
      user.email,
    );
    await this.emailService.sendOTP(user.email, otpCode);
  }

  // ─── Set Password With OTP ────────────────────────────────────────────────────

  async setPasswordWithOTP(userId: string, data: SetPasswordDTO) {
    const id = BigInt(userId);
    const user = await this.userRepo.findById(id);
    if (!user || !user.email)
      throw new AppError("Email không khả dụng", 400, "EMAIL_NOT_FOUND");

    const otp = await this.otpRepo.findValidOTP(
      OTPType.SET_PASSWORD,
      undefined,
      user.email,
    );
    if (!otp || otp.code !== data.otp)
      throw new AppError(
        "Mã xác nhận không hợp lệ hoặc đã hết hạn",
        400,
        "INVALID_OTP",
      );

    await this.otpRepo.markAsUsed(otp.id);
    const newHash = await bcrypt.hash(data.newPassword, 14);
    await this.userRepo.updatePassword(id, newHash);
  }

  // ─── Register Broker ──────────────────────────────────────────────────────────

  async registerBroker(
    userId: string,
    data: any,
    files: {
      idFront: Express.Multer.File[] | undefined;
      idBack: Express.Multer.File[] | undefined;
      brokerLicense: Express.Multer.File[] | undefined;
    },
  ) {
    const id = BigInt(userId);
    const user = await this.userRepo.findById(id);
    if (!user) throw new AppError("User not found", 404);

    const profile = await this.userRepo.findProfileByUserId(id);
    const updateData: any = {
      displayName: data.fullName,
      zaloContactPhone: data.phoneNumber,
      identityCardNumber: data.identityCardNumber || "CCCD",
      bio: `Kinh nghiệm: ${data.experienceYears} năm. Khu vực: ${data.specializedArea}`,
    };

    let socialLinks = (profile?.socialLinks as any) || {};
    if (typeof socialLinks === "string") socialLinks = JSON.parse(socialLinks);

    if (files.idFront?.[0]) {
      socialLinks.idFrontUrl = await this.uploadService.uploadImage(
        files.idFront[0].buffer,
        {
          folder: "broker_id_cards",
        },
      );
    }
    if (files.idBack?.[0]) {
      socialLinks.idBackUrl = await this.uploadService.uploadImage(
        files.idBack[0].buffer,
        {
          folder: "broker_id_cards",
        },
      );
    }
    if (files.brokerLicense?.[0]) {
      socialLinks.brokerLicenseUrl = await this.uploadService.uploadImage(
        files.brokerLicense[0].buffer,
        {
          folder: "broker_licenses",
        },
      );
    }

    updateData.socialLinks = socialLinks;
    await this.userRepo.updateProfile(id, updateData);
    return this.userRepo.updateUser(id, {
      status: "PENDING_VERIFICATION" as any,
    });
  }

  // ─── Get Dashboard User Stats ─────────────────────────────────────────────────

  async getDashboardUserCount() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [totalNonAdmin, thisMonthCount, lastMonthCount] = await Promise.all([
      prisma.user.count({
        where: { accountType: { not: 'ADMIN' as any } },
      }),
      prisma.user.count({
        where: {
          accountType: { not: 'ADMIN' as any },
          createdAt: { gte: startOfThisMonth },
        },
      }),
      prisma.user.count({
        where: {
          accountType: { not: 'ADMIN' as any },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
    ]);

    const changePercent = lastMonthCount > 0
      ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100
      : thisMonthCount > 0 ? 100 : 0;

    return {
      total: totalNonAdmin,
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      changePercent: parseFloat(changePercent.toFixed(1)),
    };
  }

  // ─── Get Pending Brokers ──────────────────────────────────────────────────────

  async getPendingBrokers() {
    return this.userRepo.findManyWithProfile({
      where: { status: "PENDING_VERIFICATION" },
      include: { profile: true },
    });
  }

  // ─── Approve Broker ───────────────────────────────────────────────────────────

  async approveBroker(brokerId: string, approve: boolean) {
    const id = BigInt(brokerId);
    if (approve) {
      return this.userRepo.updateUser(id, {
        status: "ACTIVE",
        accountType: "AGENT",
      });
    }
    return this.userRepo.updateUser(id, { status: "ACTIVE" });
  }
}
