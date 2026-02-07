import type { EventBus, EventHandler, BaseEvent } from './base-event.interface'
import type Redis from 'ioredis'

export interface RedisEventBusOptions {
  /**
   * Enable publishing events to Redis Pub/Sub for distributed workers
   * @default true
   */
  enablePubSub?: boolean

  /**
   * Prefix for Redis Pub/Sub channels
   * @default 'events:'
   */
  channelPrefix?: string

  /**
   * If true, failures to publish to Redis won't throw errors
   * Local handlers will still execute
   * @default true
   */
  gracefulDegradation?: boolean
}

/**
 * Decorator for EventBus that adds Redis Pub/Sub support
 *
 * This decorator wraps the local event bus (mitt) and additionally publishes
 * events to Redis Pub/Sub for distributed workers while maintaining local handlers.
 *
 * Architecture:
 * - Domain services publish once to this decorator
 * - Local handlers (mitt) execute immediately in the same process
 * - Redis Pub/Sub broadcasts to distributed workers in separate processes
 *
 * Example:
 * ```typescript
 * const localBus = new EventBusAdapter()
 * const hybridBus = new RedisEventBusDecorator(localBus, redisClient, {
 *   enablePubSub: true,
 *   channelPrefix: 'events:'
 * })
 *
 * // Domain service publishes once
 * await hybridBus.publish(new UserCreatedEvent(data))
 *
 * // → Local handlers execute immediately (logging, cache invalidation, etc)
 * // → Redis Pub/Sub sends to workers (emails, thumbnails, etc)
 * ```
 */
export class RedisEventBusDecorator implements EventBus {
  private readonly options: Required<RedisEventBusOptions>

  constructor(
    private readonly innerBus: EventBus,
    private readonly redis: Redis,
    options: RedisEventBusOptions = {}
  ) {
    this.options = {
      enablePubSub: options.enablePubSub ?? true,
      channelPrefix: options.channelPrefix ?? 'events:',
      gracefulDegradation: options.gracefulDegradation ?? true,
    }
  }

  /**
   * Publish event to both local handlers and Redis Pub/Sub
   */
  async publish(event: BaseEvent): Promise<void> {
    // Always publish locally first (fast, synchronous)
    await this.innerBus.publish(event)

    // Publish to Redis for distributed workers
    if (this.options.enablePubSub) {
      await this.publishToRedis(event)
    }
  }

  /**
   * Publish multiple events to both local handlers and Redis Pub/Sub
   */
  async publishAll(events: BaseEvent[]): Promise<void> {
    // Publish locally first
    await this.innerBus.publishAll(events)

    // Publish to Redis for distributed workers
    if (this.options.enablePubSub) {
      await Promise.all(events.map(event => this.publishToRedis(event)))
    }
  }

  /**
   * Subscribe to events (local handlers only)
   * Note: Workers should use RedisEventSubscriber for Redis Pub/Sub
   */
  subscribe(eventType: string, handler: EventHandler): void {
    this.innerBus.subscribe(eventType, handler)
  }

  /**
   * Unsubscribe from events (local handlers only)
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    this.innerBus.unsubscribe(eventType, handler)
  }

  /**
   * Publish event to Redis Pub/Sub channel
   */
  private async publishToRedis(event: BaseEvent): Promise<void> {
    try {
      const channel = this.getChannelName(event.eventType)
      const payload = JSON.stringify(event)

      const subscriberCount = await this.redis.publish(channel, payload)

      console.log(`[RedisEventBus] Published to ${channel} (${subscriberCount} subscribers)`)
    } catch (error) {
      if (this.options.gracefulDegradation) {
        console.error('[RedisEventBus] Failed to publish to Redis:', {
          eventType: event.eventType,
          error: error instanceof Error ? error.message : String(error),
        })
        // Don't throw - local handlers already executed successfully
      } else {
        throw error
      }
    }
  }

  /**
   * Get Redis channel name for event type
   */
  private getChannelName(eventType: string): string {
    return `${this.options.channelPrefix}${eventType}`
  }

  /**
   * Check if Redis connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping()
      return true
    } catch (error) {
      return false
    }
  }
}
