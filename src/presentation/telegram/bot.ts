import * as tg from 'telegraf'
import { message } from 'telegraf/filters'
import type { Update } from 'telegraf/types'

import { onChatMember } from './handlers/on-chat-member.handler'
import { settings } from '@/config/settings'
import { mongoConnection } from '@infrastructure/adapters/mongo'
import { runPipeline } from '@/langgraph/pipeline'
import { ensureUser } from './handlers/start.handler'
import { START_TEXT, ALREADY_REGISTERED_TEXT } from './handlers/texts'
import type { InlineKeyboardButton } from 'telegraf/types'
import { consumeGenerationAllowanceCommand } from '@/application/use-cases/generation/consume-generation-allowance.command'
import { refundGenerationAllowanceCommand } from '@/application/use-cases/generation/refund-generation-allowance.command'
import { InsufficientAllowanceError, GenerationUserNotFoundError } from '@/application/use-cases/generation/errors'
import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { UserQueryExecutorFacade } from '@/infrastructure/facade/user-query-executor.facade'
import { UserQueryBuilder as Q } from '@/users/application/ports/user-query-spec.port'
import { AllowanceCodes } from '@/application/ports/allowance-codes'

// ─── Context ───────────────────────────────────

export interface AppContext<U extends Update = Update> extends tg.Context<U> {
  // Упрощенный контекст без session
}

// ─── Helper functions ────────────────────────────────────

async function sendToManager(ctx: tg.Context, contact: { phone: string, userId: number, username?: string }) {
  // TODO: отправить контакт в чат менеджера или бота менеджера
  const managerChatId = settings.telegramManagerChatId
  if (managerChatId) {
    await ctx.telegram.sendMessage(
      managerChatId,
      `📞 Новый контакт:\n\nТелефон: ${contact.phone}\nUser ID: ${contact.userId}\nUsername: @${contact.username || 'нет'}`
    )
  }
}

async function showStartMenu(ctx: tg.Context) {
  const { user, replyText } = await ensureUser(ctx)

  const buttons: InlineKeyboardButton[][] = [
    [{ text: '🎨 Нарисовать планировку', callback_data: 'DRAW_PLAN' }],
  ]

  if (!user?.extra?.phoneNumber) {
    buttons.push([{ text: '📞 Консультация менеджера', callback_data: 'CONSULT_MANAGER' }])
  }

  if (!user?.extra?.subscribedToChannel) {
    buttons.push([{ text: '📢 Подписаться на канал', url: 'https://t.me/smrtbuild' }])
  }

  await ctx.reply(replyText, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons },
  })
}

// ─── Bot ─────────────────────────────────────────────────

class TelegramBotListener {
  private bot: tg.Telegraf<AppContext>

  constructor(token: string) {
    this.bot = new tg.Telegraf<AppContext>(token)
  }

  setupEvents() {
    // /start — создание пользователя + стартовое меню
    this.bot.command('start', async (ctx) => {
      await showStartMenu(ctx)
    })

    // Обработка inline-кнопок
    this.bot.on('callback_query', async (ctx, next) => {
      if (!('data' in ctx.callbackQuery)) return next()
      const action = ctx.callbackQuery.data

      try {
        switch (action) {
          case 'DRAW_PLAN':
            await ctx.reply(
              '✏️ Отлично! Нарисуйте планировку вашего будущего дома на любом листке бумаги.\n\n' +
              '📝 Подпишите комнаты (кухня, спальня, санузел и т.д.) и пришлите фото сюда. ' +
              'Размеры писать не требуется, лишь соблюдайте пропорции комнат при рисовании планировки\n\n' +
              '🔥 *После генерации 3D вы получите:*\n' +
              '• Фотореалистичную визуализацию в скандинавском стиле\n' +
              '• Ссылку на похожие готовые проекты\n' +
              '• Возможность сразу рассчитать смету!',
              {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [
                  [{ text: '❓ Примеры рисунков', callback_data: 'SHOW_EXAMPLES' }],
                ]},
              }
            )
            break

          case 'SHOW_EXAMPLES':
            await ctx.reply(
              '📐 Вот примеры рисунков планировок:\n\n' +
              '1. Нарисуйте стены комнат от руки\n' +
              '2. Подпишите каждую комнату\n' +
              '3. Соблюдайте примерные пропорции\n\n' +
              'Готовы? Отправьте фото вашего рисунка!'
            )
            break

          case 'CALC_ESTIMATE':
            await ctx.reply(
              '💬 *Для точной сметы нужно уточнить несколько деталей:*\n\n' +
              '1️⃣ *Площадь дома:* ⬜️ м²\n' +
              '2️⃣ *Этажность:* 🏠 одноэтажный / 🏠🏠 двухэтажный / другое\n' +
              '3️⃣ *Тип:* 🪵 каркасник / 🧱 газобетон / другое\n' +
              '4️⃣ *Участок:* ✅ есть / ❌ планирую купить\n\n' +
              '📱 *Оставьте контакт – наш архитектор свяжется в течение часа с:*\n' +
              '• ✓ Готовой сметой под ваши параметры\n' +
              '• ✓ 3D проектами похожих домов\n' +
              '• ✓ Бесплатной консультацией по участку',
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  keyboard: [[{ text: '📞 Поделиться контактом', request_contact: true }]],
                  resize_keyboard: true,
                  one_time_keyboard: true,
                },
              }
            )
            break

          case 'SUBSCRIBE':
            await ctx.reply(
              '📢 Подпишитесь на канал @smrtbuild и получите +3 генерации автоматически!',
              {
                reply_markup: { inline_keyboard: [
                  [{ text: '📢 Подписаться', url: 'https://t.me/smrtbuild' }],
                ]},
              }
            )
            break

          case 'CONSULT_MANAGER':
            await ctx.reply(
              '👨‍💼 *Хотите обсудить строительство без рисунка?*\n\n' +
              'Наш архитектор бесплатно:\n' +
              '✅ Подберет готовые проекты под ваш бюджет\n' +
              '✅ Рассчитает смету по параметрам\n' +
              '✅ Покажет варианты под ваш участок\n\n' +
              '📱 *Оставьте контакт для консультации:*\n\n' +
              '💝 *Бонус:* +10 дополнительных генераций 3D!',
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  keyboard: [[{ text: '📞 Поделиться контактом', request_contact: true }]],
                  resize_keyboard: true,
                  one_time_keyboard: true,
                },
              }
            )
            break

          default:
            await ctx.answerCbQuery('Действие недоступно')
            return
        }

        await ctx.answerCbQuery()
      } catch (error) {
        console.error('Callback error:', error)
        await ctx.answerCbQuery('Произошла ошибка')
      }
    })

    // ФОТО → сразу генерация (с проверкой allowance)
    this.bot.on(message('photo'), async (ctx) => {
      let consumedAllowanceCode: string | null = null
      let userId: string | null = null

      try {
        // 1. Проверить и списать allowance ПЕРЕД генерацией
        const telegramId = ctx.from?.id
        if (!telegramId) {
          await ctx.reply('❌ Не удалось определить пользователя. Попробуйте /start')
          return
        }

        const consumeResult = await consumeGenerationAllowanceCommand({ telegramId })
        consumedAllowanceCode = consumeResult.consumedAllowanceCode
        userId = consumeResult.userId

        // 2. Сообщить о начале генерации с остатком
        await ctx.reply(
          `⏳ Генерация 3D вашей планировки... Это займет пару минут ⏳\n\n` +
          `Осталось генераций: ${consumeResult.remainingQuantity}`
        )

        // 3. Запустить генерацию
        await runPipeline(ctx)

        // 4. Успешный результат
        await ctx.reply(
          '🏠 *Это ваш будущий дом в скандинавском стиле!*\n\n' +
          '✨ *Что дальше?*\n' +
          '• Рассчитать точную смету под ваш проект\n' +
          '• Посмотреть похожие готовые дома от Smart Build\n' +
          '• Получить еще 3 бесплатные генерации',
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [
              [{ text: '💰 Рассчитать смету', callback_data: 'CALC_ESTIMATE' }],
              [{ text: '📢 Подписаться (+3 генерации)', url: 'https://t.me/smrtbuild' }],
              [{ text: '🎨 Новая генерация', callback_data: 'DRAW_PLAN' }],
            ]},
          }
        )
      } catch (error) {
        // 5. Обработка ошибок с рефандом
        console.error('Generation error:', error)

        // Рефанд allowance при ошибке генерации
        if (userId && consumedAllowanceCode) {
          try {
            await refundGenerationAllowanceCommand({ userId, allowanceCode: consumedAllowanceCode })
            console.log('Allowance refunded:', { userId, consumedAllowanceCode })
          } catch (refundError) {
            console.error('Refund failed:', refundError)
          }
        }

        // Показать сообщение в зависимости от типа ошибки
        if (error instanceof InsufficientAllowanceError) {
          await ctx.reply(
            '❌ *У вас закончились бесплатные генерации!*\n\n' +
            '💡 *Как получить больше:*\n' +
            '• Подпишитесь на канал → +3 генерации\n' +
            '• Оставьте контакт менеджеру → +10 генераций',
            {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [
                [{ text: '📢 Подписаться на канал', url: 'https://t.me/smrtbuild' }],
                [{ text: '📞 Консультация менеджера', callback_data: 'CONSULT_MANAGER' }],
              ]},
            }
          )
        } else if (error instanceof GenerationUserNotFoundError) {
          await ctx.reply('❌ Ошибка: пользователь не найден в системе.\n\nПопробуйте выполнить команду /start')
        } else {
          const msg = error instanceof Error ? error.message : 'Неизвестная ошибка'
          await ctx.reply(
            `❌ Ошибка генерации: ${msg}\n\n` +
            `Генерация возвращена на ваш счёт. Попробуйте еще раз или обратитесь к менеджеру.`,
            {
              reply_markup: { inline_keyboard: [
                [{ text: '🎨 Попробовать снова', callback_data: 'DRAW_PLAN' }],
                [{ text: '📞 Консультация менеджера', callback_data: 'CONSULT_MANAGER' }],
              ]},
            }
          )
        }
      }
    })

    // КОНТАКТ → отправка менеджеру + бонус
    this.bot.on(message('contact'), async (ctx) => {
      const phone = ctx.message.contact.phone_number
      const userId = ctx.from?.id || 0
      const username = ctx.from?.username

      await sendToManager(ctx, { phone, userId, username })

      // Назначить +1 allowance за контакт
      try {
        if (ctx.from?.id) {
          const executor = UserQueryExecutorFacade.getInstance()
          const query = Q.extraEquals('telegramId', ctx.from.id)
          const user = await executor.executeOne(query)

          if (user) {
            const userService = UserServiceFacade.getInstance()
            const proCode = AllowanceCodes.canGenerate3DPlanPro

            // Проверить есть ли уже этот allowance
            const existingAllowance = user.getAllowance(proCode)

            if (existingAllowance) {
              // Увеличить существующий
              await userService.increaseAllowances(user.id, [proCode], [1])
            } else {
              // Создать новый
              await userService.assignAllowances(user.id, [{
                code: proCode,
                quantity: 1,
                quantityUsed: 0,
                unlimited: false,
                expiresAt: null,
              }])
            }

            console.log('Contact bonus assigned:', { userId: user.id, code: proCode })
          }
        }
      } catch (error) {
        console.error('Failed to assign contact bonus:', error)
        // Не показываем ошибку пользователю, бонус не критичен
      }

      await ctx.reply(
        '✅ *Спасибо!*\n\n' +
        '📩 Ваш запрос отправлен архитектору Smart Build.\n' +
        '⏰ Менеджер свяжется в течение 1 часа с готовой сметой и проектами.\n\n' +
        '💝 *Бонус:* +1 дополнительная генерация 3D!',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            remove_keyboard: true,
            inline_keyboard: [
              [{ text: '🎨 Новая генерация', callback_data: 'DRAW_PLAN' }],
            ],
          },
        }
      )
    })

    // ТЕКСТ → уведомление об отправке картинки
    this.bot.on(message('text'), async (ctx) => {
      await ctx.reply(
        '📸 Пожалуйста, отправьте фото вашей планировки для генерации 3D.\n\n' +
        'Если нужна помощь, выберите действие:',
        {
          reply_markup: { inline_keyboard: [
            [{ text: '❓ Примеры рисунков', callback_data: 'SHOW_EXAMPLES' }],
            [{ text: '📞 Консультация менеджера', callback_data: 'CONSULT_MANAGER' }],
          ]},
        }
      )
    })

    this.bot.on('chat_member', onChatMember)
  }

  async start() {
    await mongoConnection.connect(settings.mongoUri, settings.mongoDatabase)
    this.bot.launch({
      allowedUpdates: ['message', 'chat_member', 'callback_query'],
    })
  }

  async stop() {
    this.bot.stop()
  }
}

if (import.meta.main) {
  const listener = new TelegramBotListener(settings.telegramBotToken)
  listener.setupEvents()
  listener.start()
}

export { TelegramBotListener }
