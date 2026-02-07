import { z } from 'zod'

export const AuthAllowanceSchema = z.object({
  code: z.string(),
  unlimited: z.boolean(),
  quantityTotal: z.number(),
  quantityRemaining: z.number(),
  expiresAt: z.number().nullable(),
})

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.number(),
  licenseAcceptedAt: z.number().nullable(),
  deletedAt: z.number().nullable(),
  allowances: z.array(AuthAllowanceSchema).optional(),
  extra: z.record(z.string(), z.any()).optional(),
})

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

export const SignUpBodySchema = z.object({
  email: z.email().describe('User email address'),
  password: z
    .string()
    .min(6)
    .describe('User password (minimum 6 characters)'),
})

export const SignInBodySchema = z.object({
  email: z.email().describe('User email address'),
  password: z.string().describe('User password'),
})

export const RefreshBodySchema = z.object({
  refreshToken: z.string().describe('Valid refresh token'),
})

export const CurrentUserResponseSchema = AuthUserSchema.extend({
  allowances: z.array(AuthAllowanceSchema),
  extra: z.record(z.string(), z.any()).optional(),
})

export const UpdateUserBodySchema = z.object({
  email: z.email().optional().describe('User email address'),
  password: z.string().optional().describe('User password'),
  username: z.string().optional().describe('User username'),
  firstName: z.string().optional().describe('User first name'),
  lastName: z.string().optional().describe('User last name'),
  artistName: z.string().optional().describe('User artist name'),
  soundCloud: z.string().optional().describe('User SoundCloud profile URL'),
  telegram: z.string().optional().describe('User Telegram profile URL'),
  instagram: z.string().optional().describe('User Instagram profile URL'),
  website: z.string().optional().describe('User website URL'),
  bio: z.string().optional().describe('User bio'),
})
