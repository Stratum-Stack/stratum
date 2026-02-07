import type Redis from 'ioredis'
import type { BaseEvent } from './base-event.interface'

export type RedisEventHandler = (event: BaseEvent) => Promise<void> | void

/**
 * Simple Redis Pub/Sub subscriber for workers
 *
 * Usage in worker:
 * ```typescript
 * import { RedisAdapter } from '@/infrastructure/adapters/cache/redis.adapter'
 * import { subscribeToRedisEvents } from '@/shared/events/redis-event-subscriber'
 *
 * const redis = RedisAdapter.getClient()
 *
 * await subscribeToRedisEvents(redis, {
 *   'user:created': async (event) => {
 *     await emailService.send(event.payload.email)
 *   },
 *   'file:uploaded': async (event) => {
 *     await generateThumbnail(event.payload.id)
 *   }
 * })
 * ```
 */
export async function subscribeToRedisEvents(
  redis: Redis,
  handlers: Record<string, RedisEventHandler>,
  channelPrefix: string = 'events:'
): Promise<Redis> {
  // Create separate client for subscription
  const subscriber = redis.duplicate()

  // Subscribe to all channels
  const channels = Object.keys(handlers).map(eventType => `${channelPrefix}${eventType}`)
  await subscriber.subscribe(...channels)

  // Handle messages
  subscriber.on('message', async (channel: string, message: string) => {
    const eventType = channel.replace(channelPrefix, '')
    const handler = handlers[eventType]

    if (!handler) return

    try {
      const event = JSON.parse(message) as BaseEvent
      await handler(event)
    } catch (error) {
      console.error('[Worker] Event handler error:', {
        eventType,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  console.log('[Worker] Subscribed to events:', Object.keys(handlers))

  return subscriber
}
