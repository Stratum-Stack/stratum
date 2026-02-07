import { type EventBusPort } from '@/users/application/ports/event-bus.port'
import { EventBusAdapter } from '@root/shared/events/event-bus.adapter'
import { RedisEventBusDecorator } from '@root/shared/events/redis-event-bus.decorator'
import { setupEventHandlers } from '@root/infrastructure/event-setup'
import { RedisAdapter } from '@/infrastructure/adapters/cache/redis.adapter'
import { settings } from '@config/settings'

export class EventBusFacade {
  private static instance: EventBusPort | null = null

  private constructor() {}

  static getInstance(): EventBusPort {
    if (!EventBusFacade.instance) {
      const localBus = new EventBusAdapter()

      // Wrap with Redis decorator if enabled in settings
      if (settings.eventBus?.useRedis) {
        const redis = RedisAdapter.getClient()
        EventBusFacade.instance = new RedisEventBusDecorator(localBus, redis, {
          enablePubSub: settings.eventBus.enablePubSub ?? true,
          channelPrefix: settings.eventBus.channelPrefix ?? 'events:',
          gracefulDegradation: settings.eventBus.gracefulDegradation ?? true,
        })
      } else {
        EventBusFacade.instance = localBus
      }

      // Setup local event handlers
      setupEventHandlers(EventBusFacade.instance)
    }
    return EventBusFacade.instance
  }

  static getInstanceSync(): EventBusPort {
    return EventBusFacade.getInstance()
  }
}
