import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.email("Invalid email format").min(1, "Email is required"),
  password: z.string("Password is required").min(1, "Password is required"),
});

export type LoginRequestDTO = z.infer<typeof LoginRequestSchema>;

import type { AccountType, UserStatus } from "@prisma/client";

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    accountType: AccountType;
    status: UserStatus;
  };
}
