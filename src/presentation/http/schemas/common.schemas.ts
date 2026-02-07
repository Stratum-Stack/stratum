import { z } from 'zod'

export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export const BadRequestSchema = z.object({
  error: z.literal('Bad Request'),
  message: z.string(),
})

export const UnauthorizedResponseSchema = z.object({
  error: z.literal('Unauthorized'),
  message: z.string(),
})

export const NotFoundResponseSchema = z.object({
  error: z.literal('Not Found'),
  message: z.string(),
})

export const NotFoundSchema = z.object({
  error: z.literal('Not Found'),
  message: z.string(),
})

export const InternalServerErrorSchema = z.object({
  error: z.literal('Internal Server Error'),
  message: z.string(),
})

export const InternalErrorSchema = z.object({
  error: z.literal('Internal Server Error'),
  message: z.string(),
})
