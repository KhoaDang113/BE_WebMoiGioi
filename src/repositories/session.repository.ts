import prisma from "../config/database.js";
import type { UserSession } from "@prisma/client";

export class SessionRepository {
  async createSession(
    userId: bigint,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserSession> {
    return prisma.userSession.create({
      data: {
        userId,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        lastActiveAt: new Date(),
      },
    });
  }

  async findSessionById(id: string): Promise<UserSession | null> {
    return prisma.userSession.findUnique({
      where: { id },
    });
  }

  async revokeSession(id: string): Promise<void> {
    await prisma.userSession.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserSessions(userId: bigint): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async updateSessionActivity(id: string): Promise<void> {
    await prisma.userSession.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  async enforceMaxSessions(userId: bigint, maxActiveSessions: number = 5): Promise<void> {
    const activeSessions = await prisma.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'asc' }, // Oldest first
    });

    if (activeSessions.length >= maxActiveSessions) {
      // Need to keep only maxActiveSessions - 1 sessions to make room for the new one
      const sessionsToRevokeCount = activeSessions.length - maxActiveSessions + 1;
      const sessionsToRevoke = activeSessions.slice(0, sessionsToRevokeCount).map((s) => s.id);

      if (sessionsToRevoke.length > 0) {
        await prisma.userSession.updateMany({
          where: { id: { in: sessionsToRevoke } },
          data: { isRevoked: true },
        });
      }
    }
  }
}
