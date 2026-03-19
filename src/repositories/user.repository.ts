
import prisma from "../config/database.js";
import { Prisma, UserStatus, AccountType } from "../generated/client/client.js";
import type { User, UserProfile } from "../generated/client/client.js";

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
    const profileData: any = {
      displayName: data.displayName,
      bio: data.bio,
      address: data.address,
      avatarUrl: data.avatarUrl,
      coverUrl: data.coverUrl,
      taxCode: data.taxCode,
      identityCardNumber: data.identityCardNumber,
      brokerLicenseNumber: data.brokerLicenseNumber,
      websiteUrl: data.websiteUrl,
      socialLinks: data.socialLinks ?? Prisma.JsonNull,
      zaloContactPhone: data.zaloContactPhone,
    };

    // Remove undefined fields for update
    const updateData = Object.fromEntries(
      Object.entries(profileData).filter(([_, v]) => v !== undefined)
    );

    return prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        displayName: data.displayName ?? "",
        ...updateData
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
