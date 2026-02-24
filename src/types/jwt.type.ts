import { AccountType } from "../generated/client/client.js";

export interface JWTPayload {
    userId: string;
    accountType: AccountType;
    sessionId?: string;
}