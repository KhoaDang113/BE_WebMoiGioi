import { z } from 'zod';

export const SetPasswordSchema = z.object({
  otp: z.string().length(6, 'Mã xác nhận phải có 6 chữ số'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword']
});

export type SetPasswordDTO = z.infer<typeof SetPasswordSchema>;
