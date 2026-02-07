# Email Threading System Specification

## Обзор

Система преобразует стандартные email в структурированные цепочки сообщений (threads) для реализации chat-like интерфейса в клиентском приложении.

## Архитектура

### 1. Domain Layer

#### MailEntity

**Расположение:** `src/mail/domain/entities/mail.entity.ts`

**Новые поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `from` | `string` | Email отправителя |
| `direction` | `'incoming' \| 'outgoing'` | Направление письма |
| `threadId` | `string` | Уникальный ID цепочки сообщений |
| `inReplyTo` | `string \| null` | Message-ID родительского письма |
| `references` | `string[]` | Массив всех Message-ID в цепочке (RFC 5322) |

**Существующие поля:**
- `id` - UUID (application-generated, NOT MongoDB _id)
- `to` - получатель
- `subject` - тема
- `text` - текст
- `html` - HTML версия
- `read` - прочитано/не прочитано
- `messageId` - SMTP Message-ID
- `createdAt` - дата создания
- `deletedAt` - дата удаления (soft delete)

### 2. Infrastructure Layer

#### MongoDB Schema

**Расположение:** `src/infrastructure/models/mail.model.ts`

**Индексы:**

```typescript
// Уникальный индекс на messageId (предотвращает дубликаты)
{ messageId: 1 } // unique: true, sparse: true

// Индекс на threadId (быстрые запросы цепочек)
{ threadId: 1 }

// Составной индекс для фильтрации
{ direction: 1, threadId: 1, createdAt: 1 }
```

**Важно:** `messageId` имеет `unique: true` и `sparse: true` для предотвращения дубликатов при retry worker.

#### Repository

**Расположение:** `src/infrastructure/adapters/repositories/mail-repo-mongo.adapter.ts`

**Новые методы:**

```typescript
interface MailRepoPort {
  // Поиск по Message-ID (SMTP заголовок)
  findByMessageId(messageId: string): Promise<MailEntity | null>

  // Получить все письма в цепочке
  findByThreadId(threadId: string): Promise<MailEntity[]>

  // Сохранение с защитой от дубликатов
  saveWithDeduplication(mail: MailEntity): Promise<MailEntity>
}
```

**Логика `saveWithDeduplication()`:**

```typescript
async saveWithDeduplication(mail: MailEntity): Promise<MailEntity> {
  // Если нет messageId - просто сохраняем
  if (!mail.messageId) {
    return this.save(mail)
  }

  // Проверяем существование по messageId
  const existing = await this.findByMessageId(mail.messageId)
  if (existing) {
    return existing // Возвращаем существующее письмо
  }

  return this.save(mail) // Создаем новое
}
```

**Защита от дубликатов:**
- Worker может retry 3 раза
- Благодаря `saveWithDeduplication()` дубликаты не создаются
- Unique index в MongoDB - дополнительная защита

### 3. Application Layer

#### EmailParserService

**Расположение:** `src/mail/application/services/email-parser.service.ts`

**Назначение:** Парсинг входящих IMAP писем и извлечение threading заголовков.

**Метод:** `parseIncomingEmail(parsedMail: ParsedMail): ParsedEmailData`

**Логика генерации threadId:**

```typescript
private generateThreadId(
  references: string[],
  inReplyTo: string | null,
  messageId: string | null
): string {
  // 1. Если есть References - берем первый messageId (начало цепочки)
  if (references.length > 0) {
    return references[0]
  }

  // 2. Если есть In-Reply-To - это начало новой ветки
  if (inReplyTo) {
    return inReplyTo
  }

  // 3. Если это новое письмо - используем его messageId
  if (messageId) {
    return messageId
  }

  // 4. Fallback - генерируем новый UUID
  return randomUUID()
}
```

**Извлекаемые данные:**
- `from` - email отправителя
- `to` - email получателя
- `messageId` - из заголовка Message-ID
- `inReplyTo` - из заголовка In-Reply-To
- `references` - из заголовка References (массив)
- `threadId` - вычисляется по алгоритму выше

#### MailService

**Расположение:** `src/mail/application/services/mail.service.ts`

**Новые методы:**

```typescript
// Создание письма с deduplication
async create(input: MailCreateInput): Promise<MailDTO> {
  const mail = MailEntity.create(input)
  const savedMail = await this.mailRepo.saveWithDeduplication(mail)

  // Event публикуется только если письмо новое
  if (savedMail.id === mail.id) {
    await this.eventBus.publish(new MailCreatedIntegrationEvent(dto))
  }

  return dto
}

// Создание входящего письма
async createIncoming(input: MailCreateInput): Promise<MailDTO> {
  return this.create({ ...input, direction: 'incoming' })
}

// Получение цепочки
async findByThreadId(threadId: string): Promise<MailDTO[]> {
  const mails = await this.mailRepo.findByThreadId(threadId)
  return mails.map((m) => this.mapToDTO(m))
}

// Поиск по messageId
async findByMessageId(messageId: string): Promise<MailDTO | null> {
  const mail = await this.mailRepo.findByMessageId(messageId)
  return mail ? this.mapToDTO(mail) : null
}
```

#### Query System

**Расположение:** `src/mail/application/ports/mail-query-spec.port.ts`

**Новые query builder методы:**

```typescript
MailQueryBuilder.from(value: string)         // Поиск по отправителю
MailQueryBuilder.fromContains(value: string) // Частичный поиск
MailQueryBuilder.direction(value: 'incoming' | 'outgoing')
MailQueryBuilder.threadId(value: string)     // Фильтр по цепочке
MailQueryBuilder.messageId(value: string)    // Поиск по Message-ID
```

### 4. SMTP Integration

#### SmtpSenderAdapter

**Расположение:** `src/infrastructure/adapters/smtp-sender.adapter.ts`

**Обновленный метод send():**

```typescript
async send(mail: {
  to: string
  subject: string
  text: string
  html: string
  threadId: string
  inReplyTo?: string | null
  references?: string[]
}): Promise<MailEntity>
```

**Логика добавления заголовков:**

```typescript
const mailOptions: any = {
  from: smtpFrom,
  to: mail.to,
  subject: mail.subject,
  text: mail.text,
  html: mail.html,
}

// Добавляем In-Reply-To если это ответ
if (mail.inReplyTo) {
  mailOptions.inReplyTo = mail.inReplyTo
}

// Добавляем References для полной цепочки
if (mail.references && mail.references.length > 0) {
  mailOptions.references = mail.references.join(' ')
}

const info = await this.transporter.sendMail(mailOptions)
```

**Соответствие RFC 5322:**
- `In-Reply-To` - Message-ID письма, на которое отвечаем
- `References` - полная цепочка Message-ID, разделенная пробелами

### 5. IMAP Integration

#### GetMailQuery

**Расположение:** `src/application/queries/mail/get-mail.query.ts`

**Обновленная функция fetchMail():**

```typescript
async function fetchMail(): Promise<MailDTO[]> {
  const emailParser = new EmailParserService()
  const mailService = MailServiceFacade.getInstance()
  const savedMails: MailDTO[] = []

  // Подключение к IMAP
  await client.connect()
  await client.mailboxOpen('INBOX')

  // Обработка непрочитанных писем
  for await (const msg of client.fetch({ seen: false }, { source: true })) {
    const parsed = await simpleParser(msg.source)

    // Парсинг threading данных
    const parsedEmailData = emailParser.parseIncomingEmail(parsed)

    // Сохранение в БД с deduplication
    const savedMail = await mailService.createIncoming({
      from: parsedEmailData.from,
      to: parsedEmailData.to,
      subject: parsedEmailData.subject,
      text: parsedEmailData.text,
      html: parsedEmailData.html,
      direction: 'incoming',
      threadId: parsedEmailData.threadId,
      inReplyTo: parsedEmailData.inReplyTo,
      references: parsedEmailData.references,
      messageId: parsedEmailData.messageId ?? undefined,
      read: false,
    })

    savedMails.push(savedMail)
  }

  return savedMails
}
```

**Важно:**
- Входящие письма теперь сохраняются в БД
- Используется `saveWithDeduplication()` для предотвращения дубликатов
- Threading данные извлекаются автоматически

### 6. Use Cases

#### SendMailCommand

**Расположение:** `src/application/use-cases/mail/send-mail.command.ts`

**Обновленный интерфейс:**

```typescript
export type SendMailInput = {
  to: string
  subject: string
  text: string
  html: string
  threadId?: string        // Опционально - будет сгенерирован если нет
  inReplyTo?: string | null // Message-ID родительского письма
  references?: string[]     // Полная цепочка
}
```

**Логика формирования references:**

```typescript
const threadId = input.threadId ?? randomUUID()
const references = input.references ?? []

// Автоматически добавляем inReplyTo в references если его там нет
if (input.inReplyTo && !references.includes(input.inReplyTo)) {
  references.push(input.inReplyTo)
}
```

## Использование API

### Получение цепочки сообщений

```typescript
// Получить все письма в цепочке
const messages = await mailService.findByThreadId(threadId)

// Результат: массив MailDTO, отсортированный по createdAt
// Каждое письмо содержит:
// - direction: 'incoming' | 'outgoing'
// - from, to
// - threadId, inReplyTo, references
```

### Отправка нового письма

```typescript
await sendMailCommand({
  to: "user@example.com",
  subject: "Hello",
  text: "Message text",
  html: "<p>Message text</p>",
  // threadId, inReplyTo, references не указываем - будут сгенерированы
})
```

### Отправка ответа в цепочке

```typescript
// 1. Получаем родительское письмо
const parentMail = await mailService.findById(parentId)

// 2. Формируем references: все предыдущие + родительский messageId
const references = [
  ...parentMail.references,
  parentMail.messageId
].filter(Boolean)

// 3. Отправляем ответ
await sendMailCommand({
  to: parentMail.from,
  subject: `Re: ${parentMail.subject}`,
  text: "Reply text",
  html: "<p>Reply text</p>",
  threadId: parentMail.threadId,        // Тот же thread
  inReplyTo: parentMail.messageId,      // Message-ID родителя
  references: references                 // Полная цепочка
})
```

## Структура данных для UI

### ThreadView (для клиента)

```typescript
interface ThreadView {
  threadId: string
  subject: string
  participants: string[] // Все уникальные from/to в цепочке
  lastMessageDate: number
  unreadCount: number
  messages: ThreadMessage[]
}

interface ThreadMessage {
  id: string
  from: string
  to: string
  direction: 'incoming' | 'outgoing'
  subject: string
  text: string
  html: string
  createdAt: number
  read: boolean
}
```

### Группировка по цепочкам

```typescript
// Backend
const allMails = await mailService.findAll(1, 100)

// Frontend - группировка
const threads = groupByThreadId(allMails.mails)

function groupByThreadId(mails: MailDTO[]): ThreadView[] {
  const threadsMap = new Map<string, MailDTO[]>()

  mails.forEach(mail => {
    const thread = threadsMap.get(mail.threadId) ?? []
    thread.push(mail)
    threadsMap.set(mail.threadId, thread)
  })

  return Array.from(threadsMap.entries()).map(([threadId, messages]) => {
    const sorted = messages.sort((a, b) => a.createdAt - b.createdAt)
    const lastMessage = sorted[sorted.length - 1]

    return {
      threadId,
      subject: lastMessage.subject,
      participants: [...new Set(messages.flatMap(m => [m.from, m.to]))],
      lastMessageDate: lastMessage.createdAt,
      unreadCount: messages.filter(m => !m.read).length,
      messages: sorted.map(m => ({
        id: m.id,
        from: m.from,
        to: m.to,
        direction: m.direction,
        subject: m.subject,
        text: m.text,
        html: m.html,
        createdAt: m.createdAt,
        read: m.read,
      }))
    }
  })
}
```

## Query Examples

### Получить входящие письма

```typescript
import { MailQueryBuilder } from '@mail/application/ports/mail-query-spec.port'

const query = MailQueryBuilder.and(
  MailQueryBuilder.direction('incoming'),
  MailQueryBuilder.isNotDeleted()
)

const executor = new MongoMailQueryExecutor(db)
const result = await executor.execute(query, page, limit)
```

### Получить непрочитанные письма в цепочке

```typescript
const query = MailQueryBuilder.and(
  MailQueryBuilder.threadId(threadId),
  MailQueryBuilder.read(false)
)

const result = await executor.execute(query)
```

### Поиск по отправителю

```typescript
const query = MailQueryBuilder.fromContains('example.com')
const result = await executor.execute(query)
```

## Deduplication Strategy

### Проблема

Worker может retry отправку письма до 3 раз при ошибке. Без deduplication это создаст 3 копии письма в БД.

### Решение

**Уровень 1: Application Logic**
```typescript
async saveWithDeduplication(mail: MailEntity): Promise<MailEntity> {
  if (!mail.messageId) return this.save(mail)

  const existing = await this.findByMessageId(mail.messageId)
  if (existing) return existing // Письмо уже существует

  return this.save(mail) // Создаем новое
}
```

**Уровень 2: Database Constraint**
```typescript
// MongoDB unique index
messageId: { type: String, unique: true, sparse: true }
```

**Уровень 3: Service Logic**
```typescript
async create(input: MailCreateInput): Promise<MailDTO> {
  const mail = MailEntity.create(input)
  const savedMail = await this.mailRepo.saveWithDeduplication(mail)

  // Event публикуется только для новых писем
  if (savedMail.id === mail.id) {
    await this.eventBus.publish(new MailCreatedIntegrationEvent(dto))
  }

  return dto
}
```

### Гарантии

✅ Worker retry не создаст дубликаты
✅ Повторная доставка IMAP письма не создаст дубликат
✅ Events публикуются только для новых писем
✅ Уникальность по messageId на уровне БД

## Threading Algorithm

### RFC 5322 Compliance

Система следует стандарту RFC 5322 для email threading:

1. **Message-ID** - уникальный идентификатор письма
2. **In-Reply-To** - Message-ID письма, на которое отвечаем
3. **References** - список всех Message-ID в цепочке

### Алгоритм построения цепочки

**Входящее письмо:**
```
Message-ID: <new-message@example.com>
In-Reply-To: <parent@example.com>
References: <first@example.com> <second@example.com> <parent@example.com>
```

**Парсинг:**
```typescript
threadId = references[0] // <first@example.com>
inReplyTo = <parent@example.com>
references = [<first@example.com>, <second@example.com>, <parent@example.com>]
```

**Исходящий ответ:**
```typescript
threadId = parentMail.threadId // Тот же что у родителя
inReplyTo = parentMail.messageId
references = [...parentMail.references, parentMail.messageId]
```

## Migration Guide

### Миграция существующих данных

Если в БД уже есть письма без новых полей:

```typescript
// Скрипт миграции (выполнить один раз)
async function migrateExistingMails() {
  const mails = await MailModel.find({ threadId: { $exists: false } })

  for (const mail of mails) {
    await MailModel.updateOne(
      { _id: mail._id },
      {
        $set: {
          from: mail.from || 'unknown@soundr.ru', // Установить from
          direction: 'outgoing', // Если все письма исходящие
          threadId: mail.messageId || randomUUID(), // Каждое письмо - отдельный thread
          inReplyTo: null,
          references: [],
        }
      }
    )
  }
}
```

## Performance Considerations

### Индексы

Созданные индексы оптимизируют частые запросы:

```typescript
// Быстрый поиск дубликатов
{ messageId: 1 } // unique, sparse

// Быстрое получение цепочки
{ threadId: 1 }

// Фильтрация и сортировка
{ direction: 1, threadId: 1, createdAt: 1 }
```

### Query Optimization

```typescript
// ❌ Плохо - получаем все письма и фильтруем в JS
const allMails = await mailService.findAll(1, 10000)
const thread = allMails.filter(m => m.threadId === threadId)

// ✅ Хорошо - используем индекс
const thread = await mailService.findByThreadId(threadId)
```

## Testing

### Unit Tests

```typescript
describe('EmailParserService', () => {
  it('should generate threadId from references', () => {
    const parsed = {
      messageId: '<new@example.com>',
      references: '<first@example.com> <second@example.com>',
      inReplyTo: '<second@example.com>'
    }

    const result = emailParser.parseIncomingEmail(parsed)

    expect(result.threadId).toBe('<first@example.com>')
    expect(result.inReplyTo).toBe('<second@example.com>')
    expect(result.references).toEqual([
      '<first@example.com>',
      '<second@example.com>'
    ])
  })
})
```

### Integration Tests

```typescript
describe('Mail Threading', () => {
  it('should create thread from reply chain', async () => {
    // 1. Отправляем первое письмо
    const first = await sendMailCommand({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'First message'
    })

    // 2. Отправляем ответ
    const reply = await sendMailCommand({
      to: 'user@example.com',
      subject: 'Re: Hello',
      text: 'Reply',
      threadId: first.threadId,
      inReplyTo: first.messageId,
      references: [first.messageId]
    })

    // 3. Проверяем цепочку
    const thread = await mailService.findByThreadId(first.threadId)

    expect(thread).toHaveLength(2)
    expect(thread[0].id).toBe(first.id)
    expect(thread[1].id).toBe(reply.id)
    expect(thread[1].inReplyTo).toBe(first.messageId)
  })
})
```

## Troubleshooting

### Дубликаты писем

**Симптом:** В БД появляются дубликаты писем.

**Причины:**
1. messageId не заполняется
2. Unique index не создан
3. saveWithDeduplication() не используется

**Решение:**
```typescript
// Проверить индексы
db.mails.getIndexes()

// Должен быть:
{ "messageId": 1 }, { "unique": true, "sparse": true }

// Проверить что используется deduplication
const savedMail = await this.mailRepo.saveWithDeduplication(mail)
```

### Письма не группируются в цепочки

**Симптом:** Каждое письмо в отдельном thread.

**Причины:**
1. threadId генерируется случайно
2. References не извлекаются из заголовков
3. Для ответов не передается threadId

**Решение:**
```typescript
// Для ответов ОБЯЗАТЕЛЬНО передавать:
{
  threadId: parentMail.threadId,
  inReplyTo: parentMail.messageId,
  references: [...parentMail.references, parentMail.messageId]
}
```

### Входящие письма не сохраняются

**Симптом:** IMAP письма не появляются в БД.

**Причины:**
1. GetMailQuery возвращает старый формат
2. EmailParserService не вызывается

**Решение:**
Убедиться что GetMailQuery использует:
```typescript
const parsedEmailData = emailParser.parseIncomingEmail(parsed)
const savedMail = await mailService.createIncoming({...})
```

## Summary

Система email threading готова к использованию и предоставляет:

✅ RFC 5322 совместимость
✅ Автоматическая группировка писем в цепочки
✅ Защита от дубликатов на 3 уровнях
✅ Поддержка входящих и исходящих писем
✅ Query builder для сложных запросов
✅ Индексы для производительности
✅ Event-driven архитектура

**Готово для продакшена!** 🚀
