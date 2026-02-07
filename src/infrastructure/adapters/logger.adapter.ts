import winston from 'winston'
import { settings } from '@/config/settings'

// Custom colors for different log levels
const customColors = {
  error: 'bold red',
  warn: 'bold yellow',
  info: 'bold cyan',
  http: 'bold magenta',
  debug: 'bold white',
  verbose: 'bold gray',
}

// Add custom colors to winston
winston.addColors(customColors)

// Custom format for development environment with emojis and beautiful output
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, stack, ...meta } = info

    // Add emoji based on level
    const emoji = {
      error: '❌',
      warn: '⚠️ ',
      info: '✨',
      http: '🌐',
      debug: '🔍',
      verbose: '📝',
    }[info.level.replace(/\u001b\[\d+m/g, '')] || '📋'

    // Build the log message
    let logMessage = `${timestamp} ${emoji} ${level}: ${message}`

    // Add context if present
    if (context) {
      logMessage += ` ${winston.format.colorize().colorize('debug', `[${context}]`)}`
    }

    // Add metadata if present
    const metaKeys = Object.keys(meta)
    if (metaKeys.length > 0) {
      logMessage += `\n${winston.format.colorize().colorize('debug', JSON.stringify(meta, null, 2))}`
    }

    // Add stack trace if present
    if (stack) {
      logMessage += `\n${winston.format.colorize().colorize('error', stack)}`
    }

    return logMessage
  })
)

// Production format - JSON for log aggregation systems
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Choose format based on environment
const logFormat = settings.isDevelopment ? developmentFormat : productionFormat

// Create logger instance
const winstonLogger = winston.createLogger({
  level: settings.logLevel,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
  // Add file transports in production
  ...(settings.isProduction && {
    transports: [
      new winston.transports.Console({
        stderrLevels: ['error'],
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  }),
})

/**
 * Logger Adapter for infrastructure layer
 * Provides beautiful, structured logging with emojis in development
 * and JSON logs in production
 */
export class LoggerAdapter {
  /**
   * Log a message at a specific level
   */
  static log(level: string, message: string, meta?: Record<string, any>) {
    winstonLogger.log(level, message, meta)
  }

  /**
   * Log an info message
   */
  static info(message: string, meta?: Record<string, any>) {
    winstonLogger.info(message, meta)
  }

  /**
   * Log a warning message
   */
  static warn(message: string, meta?: Record<string, any>) {
    winstonLogger.warn(message, meta)
  }

  /**
   * Log an error message
   */
  static error(message: string, error?: Error | Record<string, any>) {
    if (error instanceof Error) {
      winstonLogger.error(message, {
        error: error.message,
        stack: error.stack,
      })
    } else {
      winstonLogger.error(message, error)
    }
  }

  /**
   * Log a debug message
   */
  static debug(message: string, meta?: Record<string, any>) {
    winstonLogger.debug(message, meta)
  }

  /**
   * Log an HTTP request/response
   */
  static http(message: string, meta?: Record<string, any>) {
    winstonLogger.http(message, meta)
  }

  /**
   * Log a verbose message
   */
  static verbose(message: string, meta?: Record<string, any>) {
    winstonLogger.verbose(message, meta)
  }

  /**
   * Create a child logger with a specific context
   */
  static child(context: string) {
    return {
      log: (level: string, message: string, meta?: Record<string, any>) => {
        winstonLogger.log(level, message, { ...meta, context })
      },
      info: (message: string, meta?: Record<string, any>) => {
        winstonLogger.info(message, { ...meta, context })
      },
      warn: (message: string, meta?: Record<string, any>) => {
        winstonLogger.warn(message, { ...meta, context })
      },
      error: (message: string, error?: Error | Record<string, any>) => {
        if (error instanceof Error) {
          winstonLogger.error(message, {
            error: error.message,
            stack: error.stack,
            context,
          })
        } else {
          winstonLogger.error(message, { ...error, context })
        }
      },
      debug: (message: string, meta?: Record<string, any>) => {
        winstonLogger.debug(message, { ...meta, context })
      },
      http: (message: string, meta?: Record<string, any>) => {
        winstonLogger.http(message, { ...meta, context })
      },
      verbose: (message: string, meta?: Record<string, any>) => {
        winstonLogger.verbose(message, { ...meta, context })
      },
    }
  }

  /**
   * Log with performance timing
   */
  static time(label: string): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      winstonLogger.debug(`⏱️  ${label} took ${duration}ms`)
    }
  }

  /**
   * Get the underlying winston logger instance
   */
  static getInstance() {
    return winstonLogger
  }
}

/**
 * Export a shorthand for the logger
 */
export const logger = LoggerAdapter
