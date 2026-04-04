import { z } from "zod";

export const GoogleLoginRequestSchema = z.object({
  idToken: z.string("Google ID token is required").min(1, "Google ID token is required"),
});

export type GoogleLoginRequestDTO = z.infer<typeof GoogleLoginRequestSchema>;

export const FacebookLoginRequestSchema = z.object({
  accessToken: z.string("Facebook access token is required").min(1, "Facebook access token is required"),
});

export type FacebookLoginRequestDTO = z.infer<typeof FacebookLoginRequestSchema>;
