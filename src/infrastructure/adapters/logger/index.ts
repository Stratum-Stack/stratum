/**
 * Logger Infrastructure
 *
 * Beautiful, structured logging for the Soundr application
 * - Development: Colorized console output with emojis
 * - Production: JSON structured logs for aggregation
 *
 * @example Basic usage
 * ```ts
 * import { logger } from '@/infrastructure/adapters/logger'
 *
 * logger.info('User authenticated', { userId: '123' })
 * logger.error('Failed to upload file', new Error('S3 error'))
 * ```
 *
 * @example Child logger with context
 * ```ts
 * const authLogger = logger.child('AuthService')
 * authLogger.info('Login attempt', { email: 'user@example.com' })
 * ```
 *
 * @example Performance timing
 * ```ts
 * const endTimer = logger.time('Database query')
 * // ... do something
 * endTimer() // Logs: ⏱️  Database query took 123ms
 * ```
 */

export { LoggerAdapter as Logger, logger } from '../logger.adapter'
