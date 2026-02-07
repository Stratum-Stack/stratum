import type { Context, NarrowedContext, Types } from 'telegraf'
import type { Update } from 'telegraf/types'
import { logger } from '@/infrastructure/adapters/logger.adapter'
import { registerUserCommand } from '@/application/use-cases/telegram-integration/user/register-user.command'
import { parseDeepLink } from '../utils/deep-link.guard'

const log = logger.child('[ StartHandler ]')

export type StartCommandHandler = NarrowedContext<
  Context,
  Update.MessageUpdate
> & Types.CommandContextExtn

/**
 * Router for /start command with deep link support
 * Handles different deep link scenarios:
 * - /start (no params) → welcome message
 */
export async function onStart(ctx: StartCommandHandler): Promise<void> {
  const from = ctx.from
  if (!from) return

  const startPayload = ctx.message && 'text' in ctx.message
    ? ctx.message.text.split(' ')[1]
    : null

  log.info('User started bot', {
    userId: from.id,
    username: from.username,
    payload: startPayload,
  })

  // Register user (always do this first)
  await registerUserCommand({
    username: from.username ?? '',
    firstName: from.first_name ?? '',
    lastName: from.last_name ?? '',
    telegramUserId: from.id,
  })

  // Route to appropriate handler based on deep link
  const deepLink = parseDeepLink(startPayload)

  // Add more deep link routes here:
  // if (deepLink?.type === 'invite') { ... }
  // if (deepLink?.type === 'channel') { ... }

  // Default welcome message (no deep link)
  const firstName = from.first_name || 'there'
  await ctx.reply(
    `👋 Welcome to ${firstName}!\n\n` +
    `Here you can discover and share amazing sample packs.\n\n` +
    `Use /help to see available commands.`
  )
}
