import { z } from 'zod'

export const AllowanceInputSchema = z.object({
  code: z.string().describe('Allowance code'),
  expiresAt: z.date().nullable().optional().describe('Expiration date'),
  quantity: z.number().describe('Total quantity'),
  quantityUsed: z.number().default(0).describe('Quantity used'),
  unlimited: z.boolean().describe('Is unlimited'),
})

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  allowances: z.array(z.object({
    code: z.string(),
    expiresAt: z.number().nullable(),
    quantityTotal: z.number(),
    quantityRemaining: z.number(),
    unlimited: z.boolean(),
  })),
  createdAt: z.number(),
  deletedAt: z.number().nullable(),
  licenseAcceptedAt: z.number().nullable(),
  extra: z.record(z.string(), z.unknown()).optional(),
})

export const UsersListResponseSchema = z.object({
  data: z.array(UserResponseSchema),
  pagination: z.object({
    page: z.number(),
    perPage: z.number(),
    total: z.number(),
  }),
})

export const CreateUserBodySchema = z.object({
  email: z.email('Invalid email address').describe('User email address'),
  password: z.string().min(6).describe('User password'),
  allowances: z.array(AllowanceInputSchema).optional().describe('User allowances'),
})

export const UpdateUserBodySchema = z.object({
  allowances: z.array(AllowanceInputSchema).optional().describe('User allowances'),
  extra: z.record(z.string(), z.unknown()).optional().describe('Extra user data'),
})

export const UserIdParamSchema = z.object({
  id: z.string().describe('User ID'),
})

export const ListUsersQuerySchema = z.object({
  email: z.string().optional().describe('Filter by email'),
  page: z.coerce.number().default(1).describe('Page number'),
  perPage: z.coerce.number().default(50).describe('Items per page'),
})
