import prisma from "../config/database.js";
import { SocialProvider } from "@prisma/client";

export class SocialIdentityRepository {
  async findByProviderAndUserId(provider: SocialProvider, providerUserId: string) {
    return prisma.socialIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerUserId: true,
        email: true,
        name: true,
        lastLoginAt: true,
      },
    });
  }

  async create(data: {
    userId: bigint;
    provider: SocialProvider;
    providerUserId: string;
    email?: string | null;
    name?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: Date | null;
  }) {
    return prisma.socialIdentity.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerUserId: data.providerUserId,
        email: data.email ?? null,
        name: data.name ?? null,
        accessToken: data.accessToken ?? null,
        refreshToken: data.refreshToken ?? null,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
        lastLoginAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerUserId: true,
        email: true,
        name: true,
        lastLoginAt: true,
      },
    });
  }

  async updateLastLogin(id: bigint) {
    await prisma.socialIdentity.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
