
import prisma from "../config/database.js";
import { Prisma, UserStatus, AccountType } from "../generated/client/client.js";
import type { User } from "../generated/client/client.js";

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

  

  async updateStatus(userId: bigint, status: UserStatus): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }
}
