import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticationHook } from '../hooks/authentication.hook'
import { AllowancePreset } from '@application/use-cases/user/allowance-preset'
import { createUserCommand, EmailRegisteredError } from '@application/use-cases/user/create-user.command'
import { authorizeUserCommand, InvalidCredentialsError } from '@application/use-cases/user/authorize-user.command'
import { refreshSessionCommand, CorruptedRefreshToken } from '@application/use-cases/user/refresh-session.command'
import { updateUserCommand, UserNotFoundError } from '@application/use-cases/user/update-user.command'
import {
  AuthTokenResponseSchema,
  SignUpBodySchema,
  SignInBodySchema,
  RefreshBodySchema,
  CurrentUserResponseSchema,
  UpdateUserBodySchema,
} from '../schemas/auth.schemas'
import {
  BadRequestSchema,
  UnauthorizedResponseSchema,
  NotFoundResponseSchema,
  InternalServerErrorSchema,
} from '../schemas/common.schemas'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: z.infer<typeof SignUpBodySchema> }>('/auth/sign-up', {
    schema: {
      description: 'Register a new user account',
      tags: ['Authentication'],
      body: SignUpBodySchema,
      response: {
        200: AuthTokenResponseSchema,
        400: BadRequestSchema,
      },
    },
  }, async (request, reply) => {
    if (!request.body) {
      reply.code(400).send({ error: 'Bad Request', message: 'Missing request body' })
    }

    try {
      const result = await createUserCommand({
        email: request.body.email,
        password: request.body.password,
        allowances: AllowancePreset.FREE(),
      })

      if (!result) {
        return reply.code(500).send({ error: 'Internal Server Error', message: 'User could not be created' })
      }

      return reply.code(200).send({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      })
    } catch(error) {
      console.error(error)
      if (error instanceof EmailRegisteredError) {
        return reply.code(409).send({ error: 'Conflict', message: 'Email already registered' })
      }
      return reply.code(500).send({ error: 'Internal Server Error', message: 'User could not be created' })
    }
  })

  fastify.post<{ Body: z.infer<typeof SignInBodySchema> }> ('/auth/sign-in', {
    schema: {
      description: 'Authenticate user and get tokens',
      tags: ['Authentication'],
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
      return reply.code(500).send({ error: 'Internal Server Error', message: 'User could not be authenticated' })
    }
  })

  fastify.post<{ Body: z.infer<typeof RefreshBodySchema> }>('/auth/refresh', {
    schema: {
      description: 'Refresh access token using refresh token',
      tags: ['Authentication'],
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

  // Update user data
  fastify.patch<{ Body: z.infer<typeof UpdateUserBodySchema> }>('/auth/me', {
    onRequest: [authenticationHook()],
    schema: {
      description: 'Update current user\'s data',
      tags: ['Authentication'],
      body: UpdateUserBodySchema,
      response: {
        200: CurrentUserResponseSchema,
        401: UnauthorizedResponseSchema,
        404: NotFoundResponseSchema,
        500: InternalServerErrorSchema,
      },
    }
  },
  async(request, reply) => {
    if (!request.body) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Missing request body' })
    }

    try {
      const { email, password, ...profileFields } = request.body
      const updateInput = {
        extra: Object.keys(profileFields).length > 0 ? profileFields : undefined
      }

      const result = await updateUserCommand(request.authContext.user.id, updateInput)

      return reply.code(200).send(result.user)
    } catch(error) {
      if (error instanceof UserNotFoundError) {
        return reply.code(404).send({ error: 'Not Found', message: 'User not found' })
      }
      return reply.code(500).send({ error: 'Internal Server Error', message: 'User could not be updated' })
    }
  })

  fastify.get('/auth/me', {
    onRequest: [authenticationHook()],
    schema: {
      description: 'Get current authenticated user',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: CurrentUserResponseSchema,
        401: UnauthorizedResponseSchema,
      },
    },
  }, async (request, reply) => {
    reply.code(200).send(request.authContext.user)
  })
}
