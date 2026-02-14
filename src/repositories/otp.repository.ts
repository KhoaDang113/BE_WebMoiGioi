
import prisma from "../config/database.js";
import { OTPType, Prisma } from "../generated/client/client.js";
import type { OTP } from "../generated/client/client.js";

export class OTPRepository {
  async createOTP(phone: string, code: string, type: OTPType, expiresAt: Date): Promise<OTP> {
    return prisma.oTP.create({
      data: {
        phone,
        code,
        type,
        expiresAt,
      },
    });
  }

  async findValidOTP(phone: string, type: OTPType): Promise<OTP | null> {
    return prisma.oTP.findFirst({
      where: {
        phone,
        type,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async markAsUsed(id: number): Promise<void> {
    await prisma.oTP.update({
      where: { id },
      data: { isUsed: true },
    });
  }
}
