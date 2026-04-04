import { z } from "zod";

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export type ForgotPasswordRequestDTO = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z.string().length(6, "OTP phải có 6 ký tự"),
  newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export type ResetPasswordRequestDTO = z.infer<typeof ResetPasswordRequestSchema>;
