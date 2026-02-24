import { z } from "zod";

export const ResendOTPRequestSchema = z.object({
  email: z.email("Invalid email address"),
});

export type ResendOTPRequestDTO = z.infer<typeof ResendOTPRequestSchema>;
