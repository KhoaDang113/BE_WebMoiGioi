import { z } from "zod";

export const UpdateProfileRequestSchema = z.object({
  displayName: z.string().min(2, "Tên hiển thị ít nhất 2 ký tự").max(100).optional(),
  avatarUrl: z.union([z.string().url("URL ảnh đại diện không hợp lệ"), z.string().length(0)]).optional().nullable(),
  coverUrl: z.union([z.string().url("URL ảnh bìa không hợp lệ"), z.string().length(0)]).optional().nullable(),
  bio: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxCode: z.string().max(20).optional().nullable(),
  identityCardNumber: z.string().max(50).optional().nullable(),
  brokerLicenseNumber: z.string().max(50).optional().nullable(),
  websiteUrl: z.union([z.string().url("URL website không hợp lệ"), z.string().length(0)]).optional().nullable(),
  socialLinks: z.any().optional().nullable(), // JSONB
  zaloContactPhone: z.string().max(20).optional().nullable(),
});

export type UpdateProfileRequestDTO = z.infer<typeof UpdateProfileRequestSchema>;
