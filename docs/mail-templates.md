# Email Templates - Руководство по использованию

## Обзор

Система отправки email поддерживает шаблоны на основе Handlebars для создания красиво оформленных писем с фирменным стилем SOUNDR.

## Доступные шаблоны

### `welcome.html` - основной шаблон

Полнофункциональный email шаблон с:
- Фирменным хедером SOUNDR
- Адаптивным дизайном (mobile-friendly)
- Поддержкой CTA кнопок
- Футером с информацией о компании

### `plain-text.html` - простой текстовый шаблон

Минимальный шаблон для текстовых рассылок без лишних переменных. Требуемые переменные:
- `subject` — тема письма
- `body_text` — текст письма (поддерживает простой HTML)

## Быстрый старт

### 1. Отправка письма с шаблоном

```typescript
import { sendTemplatedMailCommand } from '@/application/use-cases/mail/send-templated-mail.command'
import { MailTemplateType } from '@mail/application/types/mail-template.types'

// Отправляем приветственное письмо
const mail = await sendTemplatedMailCommand({
  to: 'user@example.com',
  templateType: MailTemplateType.WELCOME,
  templateVariables: {
    subject: 'Добро пожаловать в SOUNDR!',
    email_tagline: 'Приветствие',
    preheader: 'Спасибо за регистрацию в SOUNDR',
    recipient_name: 'Александр',
    recipient_email: 'user@example.com',
    body_html: `
      <p>Добро пожаловать в SOUNDR! 🎵</p>
      <p>Мы рады видеть тебя в нашем сообществе.</p>
      <p>Теперь ты можешь:</p>
      <ul>
        <li>Загружать свои сэмпл-паки</li>
        <li>Делиться музыкой с другими артистами</li>
        <li>Находить уникальные звуки для своих треков</li>
      </ul>
    `,
    cta_url: 'https://soundr.com/dashboard',
    cta_label: 'Перейти в Dashboard',
    secondary_text: 'Если кнопка не работает, скопируй ссылку: https://soundr.com/dashboard',
    sender_name: 'Команда SOUNDR',
    sender_role: 'Support Team',
    brand_name: 'SOUNDR',
    company_address: 'Москва, Россия',
    unsubscribe_url: 'https://soundr.com/unsubscribe?token=xxx',
    year: new Date().getFullYear(),
  },
})

console.log(`Письмо отправлено: ${mail.id}`)
```

### 2. Использование парсера напрямую

```typescript
import { TemplateParserService } from '@mail/application/services/template-parser.service'
import { MailTemplateType } from '@mail/application/types/mail-template.types'

const parser = new TemplateParserService()

// Рендерим шаблон
const html = await parser.render(MailTemplateType.WELCOME, {
  subject: 'Тестовое письмо',
  email_tagline: 'Тест',
  preheader: 'Это превью письма',
  recipient_name: 'Пользователь',
  recipient_email: 'test@example.com',
  body_html: '<p>Привет, это тестовое письмо!</p>',
  sender_name: 'SOUNDR Team',
  sender_role: 'Поддержка',
  brand_name: 'SOUNDR',
  company_address: 'Москва, Россия',
  unsubscribe_url: 'https://soundr.com/unsubscribe',
  year: 2026,
})

console.log(html) // Готовый HTML
```

### 3. Использование собственной строки шаблона

```typescript
const parser = new TemplateParserService()

const customTemplate = `
  <h1>Привет, {{name}}!</h1>
  <p>Твой баланс: {{balance}} рублей</p>
`

const html = parser.renderFromString(customTemplate, {
  name: 'Александр',
  balance: 1000,
})

console.log(html)
// Вывод: <h1>Привет, Александр!</h1><p>Твой баланс: 1000 рублей</p>
```

## Переменные шаблона `welcome.html`

| Переменная | Тип | Обязательна | Описание |
|------------|-----|-------------|----------|
| `subject` | string | ✅ | Тема письма |
| `email_tagline` | string | ✅ | Подзаголовок в хедере (правый верхний угол) |
| `preheader` | string | ✅ | Превью письма (показывается в списке писем) |
| `recipient_name` | string | ✅ | Имя получателя |
| `recipient_email` | string | ✅ | Email получателя |
| `body_html` | string | ✅ | Основное содержимое письма (HTML) |
| `sender_name` | string | ✅ | Имя отправителя |
| `sender_role` | string | ✅ | Должность отправителя |
| `brand_name` | string | ✅ | Название бренда |
| `company_address` | string | ✅ | Адрес компании |
| `unsubscribe_url` | string | ✅ | URL для отписки |
| `year` | number | ✅ | Текущий год |
| `cta_url` | string | ❌ | URL для кнопки CTA |
| `cta_label` | string | ❌ | Текст кнопки CTA |
| `secondary_text` | string | ❌ | Дополнительный текст под кнопкой |

## Примеры использования

### Уведомление о новом сэмпл-паке

```typescript
await sendTemplatedMailCommand({
  to: subscriber.email,
  templateType: MailTemplateType.WELCOME,
  templateVariables: {
    subject: 'Новый сэмпл-пак доступен!',
    email_tagline: 'Уведомление',
    preheader: `${artist.name} выложил новый сэмпл-пак "${pack.name}"`,
    recipient_name: subscriber.name,
    recipient_email: subscriber.email,
    body_html: `
      <p><strong>${artist.name}</strong> только что выложил новый сэмпл-пак!</p>
      <p><strong>${pack.name}</strong></p>
      <p>${pack.description}</p>
      <p>Жанр: ${pack.genre} | Количество сэмплов: ${pack.samplesCount}</p>
    `,
    cta_url: `https://soundr.com/packs/${pack.id}`,
    cta_label: 'Послушать сэмплы',
    sender_name: 'SOUNDR',
    sender_role: 'Notifications',
    brand_name: 'SOUNDR',
    company_address: 'Москва, Россия',
    unsubscribe_url: `https://soundr.com/unsubscribe?user=${subscriber.id}`,
    year: new Date().getFullYear(),
  },
})
```

### Подтверждение покупки

```typescript
await sendTemplatedMailCommand({
  to: buyer.email,
  templateType: MailTemplateType.WELCOME,
  templateVariables: {
    subject: 'Спасибо за покупку!',
    email_tagline: 'Заказ #' + order.id,
    preheader: 'Твой заказ успешно обработан',
    recipient_name: buyer.name,
    recipient_email: buyer.email,
    body_html: `
      <p>Спасибо за покупку сэмпл-пака <strong>${pack.name}</strong>!</p>
      <p>Сумма заказа: ${order.amount} ₽</p>
      <p>Ты можешь скачать свои файлы по ссылке ниже.</p>
    `,
    cta_url: `https://soundr.com/downloads/${order.id}`,
    cta_label: 'Скачать файлы',
    secondary_text: 'Ссылка будет активна 30 дней',
    sender_name: 'SOUNDR Store',
    sender_role: 'Sales',
    brand_name: 'SOUNDR',
    company_address: 'Москва, Россия',
    unsubscribe_url: `https://soundr.com/unsubscribe?user=${buyer.id}`,
    year: new Date().getFullYear(),
  },
})
```

### Сброс пароля

```typescript
await sendTemplatedMailCommand({
  to: user.email,
  templateType: MailTemplateType.WELCOME,
  templateVariables: {
    subject: 'Сброс пароля SOUNDR',
    email_tagline: 'Безопасность',
    preheader: 'Запрос на сброс пароля для твоего аккаунта',
    recipient_name: user.name,
    recipient_email: user.email,
    body_html: `
      <p>Мы получили запрос на сброс пароля для твоего аккаунта.</p>
      <p>Если это был не ты, просто проигнорируй это письмо.</p>
      <p>Ссылка для сброса пароля будет активна 1 час.</p>
    `,
    cta_url: `https://soundr.com/reset-password?token=${resetToken}`,
    cta_label: 'Сбросить пароль',
    sender_name: 'SOUNDR Security',
    sender_role: 'Security Team',
    brand_name: 'SOUNDR',
    company_address: 'Москва, Россия',
    unsubscribe_url: `https://soundr.com/settings?user=${user.id}`,
    year: new Date().getFullYear(),
  },
})
```

## Расширенные возможности

### Регистрация custom хелперов

```typescript
const parser = new TemplateParserService()

// Регистрируем хелпер для форматирования дат
parser.registerHelper('formatDate', (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU').format(date)
})

// Теперь можем использовать в шаблоне:
// {{formatDate createdAt}}
```

### Регистрация партиалов (вложенных шаблонов)

```typescript
const parser = new TemplateParserService()

parser.registerPartial('userCard', `
  <div class="user-card">
    <h3>{{name}}</h3>
    <p>{{email}}</p>
  </div>
`)

// Использование в шаблоне:
// {{> userCard user}}
```

### Очистка кэша шаблонов

```typescript
const parser = new TemplateParserService()

// Очистить кэш (полезно при изменении шаблонов)
parser.clearCache()
```

## Структура проекта

```
src/
├── mail/
│   └── application/
│       ├── services/
│       │   └── template-parser.service.ts    ← Парсер шаблонов
│       └── types/
│           └── mail-template.types.ts        ← Типы переменных
├── application/
│   └── use-cases/
│       └── mail/
│           ├── send-mail.command.ts          ← Обычная отправка
│           └── send-templated-mail.command.ts ← Отправка с шаблоном
└── infrastructure/
    └── templates/
        └── mail/
            └── welcome.html                   ← HTML шаблон
```

## Советы

1. **Всегда заполняй обязательные переменные** - иначе шаблон не отрендерится корректно
2. **Используй HTML в `body_html`** - можно добавлять списки, таблицы, изображения
3. **Тестируй на разных клиентах** - Gmail, Outlook, Apple Mail могут рендерить по-разному
4. **Не забывай про `preheader`** - это текст, который показывается в списке писем
5. **Всегда указывай `unsubscribe_url`** - это требование антиспам законов

## Тестирование

Для тестирования можно использовать сервисы типа:
- [Mailtrap.io](https://mailtrap.io) - для разработки
- [Litmus](https://litmus.com) - для проверки рендеринга
- [Email on Acid](https://www.emailonacid.com) - для тестирования совместимости
