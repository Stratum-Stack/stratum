import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'
import { mongoConnection } from '@infrastructure/adapters/mongo'
import { authRoutes } from './routes/auth.routes'

// ADMIN ROUTES
import { adminAuthRoutes } from './routes/admin/admin-auth.routes'
import { adminUsersRoutes } from './routes/admin/admin-users.routes'
import { adminSettingsRoutes } from './routes/admin/admin-settings.routes'

import { settings } from '@config/settings'
import { EventBusFacade } from '@/infrastructure/facade/event-bus.facade'

/**
 * Create and configure Fastify application
 * This is the main HTTP presentation layer setup
 */
export async function createApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    // Connection and request timeouts
    connectionTimeout: 30000, // 30 seconds - time to establish connection
    keepAliveTimeout: 65000, // 65 seconds - must be higher than load balancer timeout (usually 60s)
    requestTimeout: 30000, // 30 seconds - max time for request processing
    bodyLimit: 104857600, // 100MB - explicit body limit
    // Graceful shutdown
    forceCloseConnections: false, // Allow graceful shutdown
  }).withTypeProvider<ZodTypeProvider>()

  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Initialize database connection
  await mongoConnection.connect(settings.mongoUri, settings.mongoDatabase)

  // Initialize Event Bus with all handlers BEFORE any service can publish events
  // This prevents race conditions and ensures no events are lost during cold start
  EventBusFacade.getInstance()
  fastify.log.info('Event Bus initialized with all handlers')

  await fastify.register(import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Soundr API',
        description: 'API documentation for Soundr backend',
        version: '1.0.0',
      },
      servers: [
        {
          url: settings.apiBaseUrl,
          description: settings.isProduction ? 'Production server' : 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token in format: Bearer <token>',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
  const theme = new SwaggerTheme();
  const content = theme.getBuffer(SwaggerThemeNameEnum.ONE_DARK);
  await fastify.register(import('@fastify/swagger-ui'), {
    theme: {
      css: [
        { filename: 'theme.css', content: content }
      ],
    },
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) =>
      header
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace("style-src 'self' https:", "style-src 'self' 'unsafe-inline' https:")
        .replace('upgrade-insecure-requests;', ''),
  })

  const cors = await import('@fastify/cors')
  const multipart = await import('@fastify/multipart')

  await fastify.register(cors.default, {
    ...settings.getCorsConfig(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(multipart.default, {
    // attachFieldsToBody: true,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 10,
    },
  })

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    try {
      // Quick response for basic health check
      const health = {
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime(),
      }

      // Don't wait for DB ping on every health check (can be slow)
      // Traefik needs fast responses
      reply.code(200).send(health)
    } catch (error) {
      request.log.error({ error }, 'Health check failed')
      reply.code(503).send({
        status: 'error',
        timestamp: Date.now(),
        error: 'Service unavailable',
      })
    }
  })

  // Detailed health check with DB and cache status
  fastify.get('/health/detailed', async (request, reply) => {
    try {
      const { RedisAdapter } = await import('@/infrastructure/adapters/cache/redis.adapter')

      const [mongoHealthy, redisHealthy] = await Promise.all([
        mongoConnection.ping(),
        RedisAdapter.ping(),
      ])

      const allHealthy = mongoHealthy && redisHealthy

      const health = {
        status: allHealthy ? 'ok' : 'degraded',
        timestamp: Date.now(),
        uptime: process.uptime(),
        services: {
          mongodb: mongoHealthy ? 'connected' : 'disconnected',
          redis: redisHealthy ? 'connected' : 'disconnected',
        },
      }

      const statusCode = allHealthy ? 200 : 503
      reply.code(statusCode).send(health)
    } catch (error) {
      request.log.error({ error }, 'Detailed health check failed')
      reply.code(503).send({
        status: 'error',
        timestamp: Date.now(),
        error: 'Service unavailable',
      })
    }
  })

  // Root endpoint
  fastify.get('/', async () => {
    return {
      name: 'Soundr API',
      version: '1.0.0',
      status: 'running',
      docs: '/docs',
    }
  })

  // Register API routes
  await fastify.register(authRoutes, { prefix: '/api' })

  await fastify.register(adminAuthRoutes, { prefix: '/api/admin' })
  await fastify.register(adminUsersRoutes, { prefix: '/api/admin' })
  await fastify.register(adminSettingsRoutes, { prefix: '/api/admin' })

  // Release database connection when server shuts down
  fastify.addHook('onClose', async () => {
    await mongoConnection.disconnect()
  })

  // Global error handler
  type FastifyValidationError = FastifyError & { validation?: unknown }

  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error({ error, url: request.url, method: request.method }, 'Request error')

    // Validation errors
    if ('validation' in error && (error as FastifyValidationError).validation) {
      const validationError = error as FastifyValidationError
      return reply.status(400).send({
        error: 'Validation Error',
        message: validationError.message,
        details: validationError.validation,
      })
    }

    // Default error response
    const statusCode = error.statusCode || 500
    return reply.status(statusCode).send({
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
    })
  })

  return fastify
}
