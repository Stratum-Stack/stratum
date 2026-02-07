import { type FastifyRequest, type FastifyReply } from 'fastify'
import { AuthServiceFacade } from '@infrastructure/facade/auth-service.facade'
import { AuthorizationContextFactory } from '@infrastructure/factory/auth/authorization-context.factory'
import type { AuthorizationContext } from '@application/services/authorization-context'
import { AllowanceCodes } from '@application/ports/allowance-codes'

// Extend Fastify types to include authContext
declare module 'fastify' {
  interface FastifyRequest {
    authContext: AuthorizationContext
  }
}

/**
 * Authentication hook that verifies JWT token and creates AuthorizationContext
 *
 * Usage:
 * ```typescript
 * // In routes that require authentication:
 * fastify.get('/protected', { onRequest: [authenticationHook(code)] }, async (request, reply) => {
 *   const user = request.authContext.user
 *   return { user }
 * })
 * ```
 */
export const authenticationHook = (allowedAllowances: AllowanceCodes[] = []) => async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    })
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const authService = AuthServiceFacade.getInstance()
    const decoded = authService.verifyToken(token)
    const authContext = await AuthorizationContextFactory.createFromUserId(decoded.sub)

    if (!authContext) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'User not found'
      })
    }

    // Если указаны требуемые allowances, проверяем что у пользователя есть хотя бы один
    if (allowedAllowances.length > 0) {
      const hasRequiredAllowance = allowedAllowances.some(allowance => authContext.can(allowance))

      if (!hasRequiredAllowance) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        })
      }
    }

    request.authContext = authContext

  } catch (error) {
    request.log.error({ error }, 'Authentication failed')
    return reply.code(401).send({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token'
    })
  }
}
