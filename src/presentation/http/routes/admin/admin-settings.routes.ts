import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { findSettings } from '@/application/queries/settings/find-settings.query'
import { updateSettings } from '@/application/use-cases/settings/update-settings.command'
import { authenticationHook } from '@/presentation/http/hooks/authentication.hook'
import { AllowanceCodes } from '@/application/ports/allowance-codes'
import {
  SettingsListResponseSchema,
  UpdateSettingsBodySchema,
  UpdateSettingsResponseSchema,
} from '../../schemas/admin/settings.schemas'
import {
  BadRequestSchema,
  InternalErrorSchema,
} from '../../schemas/common.schemas'

export async function adminSettingsRoutes(fastify: FastifyInstance) {
  // GET /api/admin/settings - Get all settings
  fastify.get(
    '/settings',
    {
      onRequest: [authenticationHook([AllowanceCodes.canManageAll])],
      schema: {
        description: 'Get all settings',
        tags: ['Admin/Settings'],
        security: [{ bearerAuth: [] }],
        response: {
          200: SettingsListResponseSchema,
          500: InternalErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const settings = await findSettings()

        return reply.code(200).send({
          data: settings.map(s => ({
            key: s.key,
            value: s.value,
          })),
        })
      } catch (error) {
        console.error(error)
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch settings',
        })
      }
    }
  )

  // PATCH /api/admin/settings - Update settings
  fastify.patch<{ Body: z.infer<typeof UpdateSettingsBodySchema> }>(
    '/settings',
    {
      onRequest: [authenticationHook([AllowanceCodes.canManageAll])],
      schema: {
        description: 'Update multiple settings',
        tags: ['Admin/Settings'],
        security: [{ bearerAuth: [] }],
        body: UpdateSettingsBodySchema,
        response: {
          200: UpdateSettingsResponseSchema,
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
        const { settings } = request.body

        if (!settings || settings.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Settings array is required and must not be empty',
          })
        }

        const result = await updateSettings(settings, request.authContext.user.email)

        return reply.code(200).send({
          data: result,
        })
      } catch (error) {
        console.error(error)
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update settings',
        })
      }
    }
  )
}
