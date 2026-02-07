import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authorizeUserCommand, InvalidCredentialsError } from '@application/use-cases/user/authorize-user.command'
import { refreshSessionCommand, CorruptedRefreshToken } from '@application/use-cases/user/refresh-session.command'
import { findAdminQuery } from '@/application/queries/user/find-admin.query'
import {
  AuthTokenResponseSchema,
  SignInBodySchema,
  RefreshBodySchema,
} from '../../schemas/admin/auth.schemas'
import {
  BadRequestSchema,
  UnauthorizedResponseSchema,
} from '../../schemas/common.schemas'

export async function adminAuthRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: z.infer<typeof SignInBodySchema> }> ('/auth/sign-in', {
    schema: {
      description: 'Authenticate user and get tokens',
      tags: ['Admin/Authentication'],
      body: SignInBodySchema,
      response: {
        200: AuthTokenResponseSchema,
        400: BadRequestSchema,
        401: UnauthorizedResponseSchema,
      },
    },
  },
  async (request, reply) => {
    if (!request.body) {
      reply.code(400).send({ error: 'Bad Request', message: 'Missing request body' })
    }

    try {
      const isAdmin = await findAdminQuery({ email: request.body.email })

      if (!isAdmin) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid credentials' })
      }

      const result = await authorizeUserCommand({
        email: request.body.email,
        password: request.body.password
      })

      if (!result) {
        return reply.code(500).send({ error: 'Internal Server Error', message: 'User could not be authenticated' })
      }

      return reply.code(200).send({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      })
    } catch(error) {
      if (error instanceof InvalidCredentialsError) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid credentials' })
      }
      console.error(error)
      return reply.code(500).send({ error: 'Internal Server Error', message: 'User could not be authenticated' })
    }
  })

  fastify.post<{ Body: z.infer<typeof RefreshBodySchema> }>('/auth/refresh', {
    schema: {
      description: 'Refresh access token using refresh token',
      tags: ['Admin/Authentication'],
      body: RefreshBodySchema,
      response: {
        200: AuthTokenResponseSchema,
        400: BadRequestSchema,
        401: UnauthorizedResponseSchema,
      },
    },
  },
  async (request, reply) => {
    if (!request.body) {
      reply.code(400).send({ error: 'Bad Request', message: 'Missing request body' })
    }

    try {
      const result = await refreshSessionCommand(request.body.refreshToken)

      if (!result) {
        return reply.code(500).send({ error: 'Internal Server Error', message: 'User could not be authenticated' })
      }

      return reply.code(200).send({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      })
    } catch(error) {
      if (error instanceof CorruptedRefreshToken) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid refresh token' })
      }
      return reply.code(500).send({ error: 'Internal Server Error', message: 'User could not be authenticated' })
    }
  })
}
