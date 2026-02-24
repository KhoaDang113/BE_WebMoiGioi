import { z } from "zod";

export const VerifyOTPRequestSchema = z.object({
  email: z.email("Invalid email address"),
  otp: z.string("OTP is required").length(6, "OTP must be 6 digits"),
});

export type VerifyOTPRequestDTO = z.infer<typeof VerifyOTPRequestSchema>;
