import { z } from "zod";

export const RegisterRequestSchema = z
  .object({
    fullName: z
      .string("Full name is required")
      .min(2, "Full name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    phone: z
      .string("Phone number is required")
      .regex(
        /^(03|05|07|08|09|01[2|6|8|9])+(\d{8})$/,
        "Invalid Vietnamese phone number",
      ),
    password: z
      .string("Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/\d/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string("Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterRequestDTO = z.infer<typeof RegisterRequestSchema>;
