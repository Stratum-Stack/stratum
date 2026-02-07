import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createUserCommand, EmailRegisteredError, UserNotCreatedError } from '@application/use-cases/user/create-user.command'
import { updateUserCommand, UserNotFoundError } from '@application/use-cases/user/update-user.command'
import { deleteUserCommand } from '@application/use-cases/user/delete-user.command'
import { findUsersQuery } from '@application/queries/user/find-users.query'
import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { authenticationHook } from '@/presentation/http/hooks/authentication.hook'
import { AllowanceCodes } from '@/application/ports/allowance-codes'
import {
  UserResponseSchema,
  UsersListResponseSchema,
  CreateUserBodySchema,
  UpdateUserBodySchema,
  UserIdParamSchema,
  ListUsersQuerySchema,
} from '../../schemas/admin/users.schemas'
import {
  BadRequestSchema,
  NotFoundSchema,
  InternalErrorSchema,
} from '../../schemas/common.schemas'

export async function adminUsersRoutes(fastify: FastifyInstance) {
  // GET /api/admin/users - List all users
  fastify.get<{ Querystring: z.infer<typeof ListUsersQuerySchema> }>(
    '/users',
    {
      onRequest: [authenticationHook([AllowanceCodes.canManageUsers, AllowanceCodes.canManageAll])],
      schema: {
        description: 'Get list of users with pagination',
        tags: ['Admin/Users'],
        security: [{ bearerAuth: [] }],
        querystring: ListUsersQuerySchema,
        response: {
          200: UsersListResponseSchema,
          400: BadRequestSchema,
          500: InternalErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { email, page, perPage } = request.query

        if (email) {
          const result = await findUsersQuery({ email }, { page, perPage })
          return reply.code(200).send({
            data: result.data.map((user) => ({
              id: user.id,
              email: user.email,
              allowances: user.allowances.map(a => ({
                code: a.code,
                expiresAt: a.expiresAt,
                quantityTotal: a.quantityTotal,
                quantityRemaining: a.quantityRemaining,
                unlimited: a.unlimited,
              })),
              createdAt: user.createdAt,
              deletedAt: user.deletedAt,
              licenseAcceptedAt: user.licenseAcceptedAt,
              extra: user.extra,
            })),
            pagination: {
              page,
              perPage,
              total: result.total,
            },
          })
        }

        // If no email filter, get all users
        const userService = UserServiceFacade.getInstance()
        const result = await userService.findAll(page, perPage)

        return reply.code(200).send({
          data: result.users.map(({ password: _, ...user }) => user),
          pagination: {
            page,
            perPage,
            total: result.total,
          },
        })
      } catch (error) {
        console.error(error)
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch users',
        })
      }
    }
  )

  // GET /api/admin/users/:id - Get single user
  fastify.get<{ Params: z.infer<typeof UserIdParamSchema> }>(
    '/users/:id',
    {
      onRequest: [authenticationHook([AllowanceCodes.canManageAll, AllowanceCodes.canManageUsers])],
      schema: {
        description: 'Get user by ID',
        tags: ['Admin/Users'],
        security: [{ bearerAuth: [] }],
        params: UserIdParamSchema,
        response: {
          200: UserResponseSchema,
          404: NotFoundSchema,
          500: InternalErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params
        const userService = UserServiceFacade.getInstance()
        const user = await userService.findById(id)

        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          })
        }

        const { password: _, ...userWithoutPassword } = user
        return reply.code(200).send(userWithoutPassword)
      } catch (error) {
        console.error(error)
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch user',
        })
      }
    }
  )

  // POST /api/admin/users - Create new user
  fastify.post<{ Body: z.infer<typeof CreateUserBodySchema> }>(
    '/users',
    {
      onRequest: [authenticationHook([AllowanceCodes.canManageAll, AllowanceCodes.canManageUsers])],
      schema: {
        description: 'Create a new user',
        tags: ['Admin/Users'],
        security: [{ bearerAuth: [] }],
        body: CreateUserBodySchema,
        response: {
          201: UserResponseSchema,
          400: BadRequestSchema,
          500: InternalErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.body) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Missing request body',
        })
      }

      try {
        const result = await createUserCommand({
          email: request.body.email,
          password: request.body.password,
          allowances: request.body.allowances,
        })

        if (!result) {
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'User could not be created',
          })
        }

        return reply.code(201).send(result.user)
      } catch (error) {
        if (error instanceof EmailRegisteredError) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Email already registered',
          })
        }
        if (error instanceof UserNotCreatedError) {
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'User could not be created',
          })
        }
        console.error(error)
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create user',
        })
      }
    }
  )

  // PATCH /api/admin/users/:id - Update user
  fastify.patch<{
    Params: z.infer<typeof UserIdParamSchema>
    Body: z.infer<typeof UpdateUserBodySchema>
  }>(
    '/users/:id',
    {
      onRequest: [authenticationHook([AllowanceCodes.canManageAll, AllowanceCodes.canManageUsers])],
      schema: {
        description: 'Update user by ID',
        tags: ['Admin/Users'],
        security: [{ bearerAuth: [] }],
        params: UserIdParamSchema,
        body: UpdateUserBodySchema,
        response: {
          200: UserResponseSchema,
          400: BadRequestSchema,
          404: NotFoundSchema,
          500: InternalErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.body) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Missing request body',
        })
      }

      try {
        const { id } = request.params
        const result = await updateUserCommand(id, {
          allowances: request.body.allowances,
          extra: request.body.extra,
        })

        return reply.code(200).send(result.user)
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          })
        }
        console.error(error)
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update user',
        })
      }
    }
  )

  // DELETE /api/admin/users/:id - Delete user
  fastify.delete<{ Params: z.infer<typeof UserIdParamSchema> }>(
    '/users/:id',
    {
      onRequest: [authenticationHook([AllowanceCodes.canManageAll, AllowanceCodes.canManageUsers])],
      schema: {
        description: 'Delete user by ID',
        tags: ['Admin/Users'],
        security: [{ bearerAuth: [] }],
        params: UserIdParamSchema,
        response: {
          200: UserResponseSchema,
          404: NotFoundSchema,
          500: InternalErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params
        const result = await deleteUserCommand(id)

        if (!result) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          })
        }

        return reply.code(200).send(result.user)
      } catch (error) {
        console.error(error)
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete user',
        })
      }
    }
  )
}
