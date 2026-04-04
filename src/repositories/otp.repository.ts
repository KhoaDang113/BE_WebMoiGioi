import prisma from "../config/database.js";
import { OTPType, Prisma } from "@prisma/client";
import type { OTP } from "@prisma/client";

export class OTPRepository {
  async createOTP(
    type: OTPType,
    code: string,
    expiresAt: Date,
    phone?: string,
    email?: string,
  ): Promise<OTP> {
    return prisma.oTP.create({
      data: {
        phone: phone || null,
        email: email || null,
        code,
        type,
        expiresAt,
      },
    });
  }

  async findValidOTP(type: OTPType, phone?: string, email?: string): Promise<OTP | null> {
    const where: Prisma.OTPWhereInput = {
      type,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
    };

    return prisma.oTP.findFirst({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findLatestOTP(type: OTPType, phone?: string, email?: string): Promise<OTP | null> {
    const where: Prisma.OTPWhereInput = { 
      type,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
    };

    return prisma.oTP.findFirst({
      where,
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

  async deleteOTP(id: number): Promise<void> {
    await prisma.oTP.delete({
      where: { id },
    });
  }
}



