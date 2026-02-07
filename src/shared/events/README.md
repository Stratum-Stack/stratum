# Event Bus Architecture

Гибридная система событий с локальными обработчиками и поддержкой распределенных воркеров через Redis Pub/Sub.

## 📋 Архитектура

```
┌──────────────────────────────────────────────────────────┐
│              Domain Service (User, Asset, etc)           │
│  await eventBus.publish(new UserCreatedEvent(data))      │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│           RedisEventBusDecorator (Hybrid)                │
│                                                           │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  Local (mitt)       │  │  Redis Pub/Sub           │  │
│  │  - Быстрые операции │  │  - Для воркеров          │  │
│  └─────────────────────┘  └──────────────────────────┘  │
└──────────────┬──────────────────────────┬────────────────┘
               │                          │
               ▼                          ▼
    ┌──────────────────┐       ┌──────────────────────┐
    │ Backend Process  │       │  Worker Processes    │
    │ - Logging        │       │  - Send emails       │
    │ - Cache          │       │  - Thumbnails        │
    │ - Analytics      │       │  - Heavy tasks       │
    └──────────────────┘       └──────────────────────┘
```

## 🚀 Использование

### В доменных сервисах (Backend)

Сервисы публикуют события **один раз**:

```typescript
// src/users/application/services/user.service.ts
import { UserCreatedIntegrationEvent } from '@application/integration-events'

const user = User.create(fields)
await this.userRepo.save(user)

// Публикуем событие один раз
const event = new UserCreatedIntegrationEvent(UserDTO.fromEntity(user))
await this.eventBus.publish(event)
```

### Локальные обработчики (Backend)

Регистрируются в `src/infrastructure/event-setup.ts`:

```typescript
export function setupEventHandlers(eventBus: EventBusPort): void {
  eventBus.subscribe('user:created', async (event: UserCreatedIntegrationEvent) => {
    // ТОЛЬКО быстрые операции!
    console.log('[EVENT] User created:', event.payload.id)

    // Инвалидация кеша (быстро)
    await cache.del(`user:${event.payload.id}`)

    // Аналитика (быстро)
    analytics.track('user_created', event.payload)
  })
}
```

### Воркеры (Отдельные процессы)

Создаются в `src/workers/`:

```typescript
// src/workers/email-worker.ts
import { RedisAdapter } from '@/infrastructure/adapters/cache/redis.adapter'
import { subscribeToRedisEvents } from '@/shared/events/redis-event-subscriber'

const redis = RedisAdapter.getClient()

await subscribeToRedisEvents(redis, {
  'user:created': async (event) => {
    // ТОЛЬКО тяжелые асинхронные задачи!
    await emailService.sendWelcomeEmail(event.payload.email)
    await webhookService.notify('user.created', event.payload)
  },

  'file:uploaded': async (event) => {
    await thumbnailService.generate(event.payload.id)
    await virusScanService.scan(event.payload.id)
  }
})
```

## ⚙️ Конфигурация

В `.env`:

```bash
# Включить Redis Pub/Sub для распределенных воркеров
EVENT_BUS_USE_REDIS=true

# Включить публикацию в Redis
EVENT_BUS_ENABLE_PUBSUB=true

# Префикс для Redis каналов
EVENT_BUS_CHANNEL_PREFIX=events:

# Graceful degradation (работать без Redis если он упал)
EVENT_BUS_GRACEFUL_DEGRADATION=true
```

## 📦 Компоненты

### 1. EventBusAdapter (Local)
- Локальная шина на основе `mitt`
- Быстрая, синхронная обработка
- Используется для операций внутри процесса

### 2. RedisEventBusDecorator (Hybrid)
- Оборачивает локальную шину
- Публикует события в Redis Pub/Sub
- Поддерживает graceful degradation

### 3. RedisEventSubscriber (Workers)
- Простая функция для подписки на Redis
- Используется в воркерах
- Обрабатывает тяжелые задачи

## ✅ Правила разделения ответственности

### Backend (Локальные обработчики)
✅ Логирование
✅ Инвалидация кеша
✅ Аналитика (трекинг)
✅ In-app уведомления
✅ Обновление счетчиков

### Workers (Redis Pub/Sub)
✅ Отправка email
✅ Генерация thumbnails
✅ Обработка видео/аудио
✅ Вызовы внешних API
✅ Webhooks
✅ Тяжелые вычисления

### ❌ НЕ делайте
- Не дублируйте логику между backend и workers
- Не делайте тяжелые операции в локальных обработчиках
- Не делайте быстрые операции в воркерах

## 🔧 Запуск воркеров

```bash
# Development
bun src/workers/event-worker.example.ts

# Production (PM2)
pm2 start src/workers/event-worker.example.ts --name event-worker

# Docker
docker-compose up worker
```

## 🛠️ Создание нового события

1. **Создайте класс события:**

```typescript
// src/module/application/integration-events/my-event.integration-event.ts
import { BaseDomainEvent } from '@domain/events/domain-event.interface'

export class MyEventIntegrationEvent extends BaseDomainEvent {
  constructor(readonly payload: MyDTO) {
    super('my:event')
  }
}
```

2. **Опубликуйте в сервисе:**

```typescript
const event = new MyEventIntegrationEvent(data)
await this.eventBus.publish(event)
```

3. **Добавьте локальный обработчик (опционально):**

```typescript
// src/infrastructure/event-setup.ts
eventBus.subscribe('my:event', async (event) => {
  console.log('[EVENT] My event:', event.payload)
})
```

4. **Добавьте воркер обработчик (опционально):**

```typescript
// src/workers/my-worker.ts
await subscribeToRedisEvents(redis, {
  'my:event': async (event) => {
    await heavyTask(event.payload)
  }
})
```

## 🐛 Отладка

```typescript
// Проверить здоровье Redis
const decorator = EventBusFacade.getInstance() as RedisEventBusDecorator
const isHealthy = await decorator.healthCheck()
console.log('Redis healthy:', isHealthy)
```

## 📊 Статистика

- **36 типов событий** определено
- **10 обработчиков** зарегистрировано в backend
- **11 доменных модулей** с событиями
