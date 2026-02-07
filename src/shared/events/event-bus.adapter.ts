import mitt, { type Emitter } from 'mitt'
import type { EventBus, EventHandler, BaseEvent } from './base-event.interface'
import type { AllDomainEvents } from './all-domain-events.type'

export class EventBusAdapter implements EventBus {
  private emitter: Emitter<Record<string, AllDomainEvents>>

  constructor() {
    this.emitter = mitt<Record<string, AllDomainEvents>>()
  }

  async publish(event: BaseEvent): Promise<void> {
    // Emit synchronously (in-memory is instant)
    // Handlers are called asynchronously via mitt
    this.emitter.emit(event.eventType, event as unknown as AllDomainEvents)
  }

  async publishAll(events: BaseEvent[]): Promise<void> {
    // Emit all events synchronously
    events.forEach(event => {
      this.emitter.emit(event.eventType, event as unknown as AllDomainEvents)
    })
  }

  subscribe(eventType: string, handler: EventHandler): void {
    this.emitter.on(eventType, handler)
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.emitter.off(eventType, handler)
  }
}
