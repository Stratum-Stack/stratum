import Redis from 'ioredis'
import type * as IORedis from 'ioredis'
import { settings } from '@/config/settings'

export class RedisAdapter {
  private static instance: Redis | null = null

  static getOptions(): IORedis.RedisOptions {
    // Parse Redis URI to extract connection options
    const url = new URL(settings.redisUri)

    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      db: parseInt(url.pathname.slice(1)) || 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 10000, // 10 секунд таймаут
      lazyConnect: false, // Подключаться сразу
      retryStrategy(times: number) {
        console.log(`[Redis] Retry attempt ${times}`)
        if (times > 5) {
          console.error('[Redis] Max retries reached, giving up')
          return null // Прекратить попытки
        }
        const delay = Math.min(times * 50, 2000)
        return delay
      }
    }
  }

  static getClient(): Redis {
    if (!RedisAdapter.instance) {
      console.log('[Redis] Connecting to Redis...')
      const options = RedisAdapter.getOptions()
      console.log(`[Redis] Host: ${options.host}:${options.port}`)

      RedisAdapter.instance = new Redis(options)

      RedisAdapter.instance.on('connect', () => {
        console.log('[Redis] TCP connection established')
      })

      RedisAdapter.instance.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message)
      })

      RedisAdapter.instance.once('ready', () => {
        console.log('[Redis] ✓ Ready')
      })

      RedisAdapter.instance.on('close', () => {
        console.log('[Redis] Connection closed')
      })

      RedisAdapter.instance.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...')
      })
    }

    return RedisAdapter.instance
  }

  static async disconnect(): Promise<void> {
    if (RedisAdapter.instance) {
      await RedisAdapter.instance.quit()
      RedisAdapter.instance = null
    }
  }

  static async ping(): Promise<boolean> {
    try {
      if (!RedisAdapter.instance) return false
      const result = await RedisAdapter.instance.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('[Redis] Ping failed:', error)
      return false
    }
  }
}

export const redis = RedisAdapter.getClient()
export const redisOptions = RedisAdapter.getOptions()
