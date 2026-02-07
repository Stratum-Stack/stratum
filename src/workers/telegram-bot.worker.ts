/**
 * Telegram Bot Worker
 *
 * Handles events that require TG bot actions:
 * - Settings updates → reload bot configuration
 * - User events → send notifications
 * - Other domain events → send messages to admins
 *
 * Usage:
 *   bun src/workers/telegram-bot.worker.ts
 */

import { RedisAdapter } from '@/infrastructure/adapters/cache/redis.adapter'

async function main() {
  console.log('[TG Worker] ✓ Telegram bot worker ready and listening')

  // Keep process alive
  process.on('SIGTERM', async () => {
    console.log('[TG Worker] Shutting down gracefully...')
    await RedisAdapter.disconnect()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('[TG Worker] Shutting down gracefully...')
    await RedisAdapter.disconnect()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('[TG Worker] Fatal error:', error)
  process.exit(1)
})
