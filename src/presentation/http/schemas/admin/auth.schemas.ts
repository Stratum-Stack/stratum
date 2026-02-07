import { z } from 'zod'

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

export const SignInBodySchema = z.object({
  email: z.email().describe('User email address'),
  password: z.string().describe('User password'),
})

export const RefreshBodySchema = z.object({
  refreshToken: z.string().describe('Valid refresh token'),
})
