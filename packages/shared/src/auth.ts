import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

// bcrypt only uses the first 72 bytes, so longer passwords add nothing.
export const passwordSchema = z.string().min(10, 'Use at least 10 characters').max(72);

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });
export type RefreshInput = z.infer<typeof refreshSchema>;

export interface PublicAccount {
  id: string;
  email: string;
  name: string;
  /** Where the person lives, as they wrote it; used in the draft will. */
  address: string | null;
}

// The profile: what a person can change about themselves. An empty address clears it.
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  address: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform(value => (value === '' ? null : value)),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  account: PublicAccount;
}
