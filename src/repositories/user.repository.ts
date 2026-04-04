
import crypto from "crypto";
import prisma from "../config/database.js";
import { Prisma, UserStatus, AccountType } from "@prisma/client";
import type { User, UserProfile } from "@prisma/client";

export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  async findById(id: bigint) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        publicId: true,
        phoneNumber: true,
        email: true,
        accountType: true,
        status: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        kycLevel: true,
        createdAt: true,
      }
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        publicId: true,
        phoneNumber: true,
        email: true,
        accountType: true,
        status: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        kycLevel: true,
        createdAt: true,
      }
    });
  }

  async findByPhone(phoneNumber: string) {
    return prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        publicId: true,
        phoneNumber: true,
        email: true,
        accountType: true,
        status: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        kycLevel: true,
        createdAt: true,
      }
    });
  }

  async findAuthByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        publicId: true,
        phoneNumber: true,
        email: true,
        passwordHash: true,
        accountType: true,
        status: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        kycLevel: true,
        createdAt: true,
      }
    });
  }

  

  async createSocialUser(data: {
    email?: string | null;
    accountType: AccountType;
  }) {
    return prisma.user.create({
      data: {
        email: data.email ?? null,
        accountType: data.accountType,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      },
      select: {
        id: true,
        publicId: true,
        phoneNumber: true,
        email: true,
        accountType: true,
        status: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        kycLevel: true,
        createdAt: true,
      },
    });
  }

  async updateStatus(userId: bigint, status: UserStatus): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async findProfileByUserId(userId: bigint): Promise<UserProfile | null> {
    return prisma.userProfile.findUnique({
      where: { userId },
    });
  }

  async findManyWithProfile(query: any) {
    return prisma.user.findMany(query);
  }

  async updateUser(userId: bigint, data: any) {
    return prisma.user.update({
      where: { id: userId },
      data
    });
  }

  async updateProfile(
    userId: bigint,
    data: {
      displayName?: string;
      bio?: string | null;
      address?: string | null;
      avatarUrl?: string | null;
      coverUrl?: string | null;
      taxCode?: string | null;
      identityCardNumber?: string | null;
      brokerLicenseNumber?: string | null;
      websiteUrl?: string | null;
      socialLinks?: Prisma.InputJsonValue | null;
      zaloContactPhone?: string | null;
    },
  ): Promise<UserProfile> {
    const updateData: Prisma.UserProfileUpdateInput = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;
    if (data.taxCode !== undefined) updateData.taxCode = data.taxCode;
    if (data.identityCardNumber !== undefined) updateData.identityCardNumber = data.identityCardNumber;
    if (data.brokerLicenseNumber !== undefined) updateData.brokerLicenseNumber = data.brokerLicenseNumber;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
    if (data.socialLinks !== undefined) updateData.socialLinks = data.socialLinks ?? Prisma.JsonNull;
    if (data.zaloContactPhone !== undefined) updateData.zaloContactPhone = data.zaloContactPhone;

    return prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        displayName: data.displayName ?? "",
        bio: data.bio ?? null,
        address: data.address ?? null,
        avatarUrl: data.avatarUrl ?? null,
        coverUrl: data.coverUrl ?? null,
        taxCode: data.taxCode ?? null,
        identityCardNumber: data.identityCardNumber ?? null,
        brokerLicenseNumber: data.brokerLicenseNumber ?? null,
        websiteUrl: data.websiteUrl ?? null,
        socialLinks: (data.socialLinks ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        zaloContactPhone: data.zaloContactPhone ?? null,
      },
    });
  }



  async updatePassword(userId: bigint, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        // Rotate securityStamp để invalidate các token cũ nếu cần
        securityStamp: crypto.randomUUID(),
      },
    });
  }

  async findPasswordHashById(userId: bigint): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return user?.passwordHash ?? null;
  }
}
