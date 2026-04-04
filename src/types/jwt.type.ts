import { AccountType } from "@prisma/client";

export interface JWTPayload {
    userId: string;
    accountType: AccountType;
    sessionId?: string;
}