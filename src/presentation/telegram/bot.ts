import * as tg from 'telegraf'
import { onStart } from './handlers/start.handler'
import { settings } from '@/config/settings'
import { mongoConnection } from '@infrastructure/adapters/mongo'

class TelegramBotListener {
  private bot: tg.Telegraf

  constructor(token: string) {
    this.bot = new tg.Telegraf(token)
  }

  setupEvents() {
    this.bot.command('start', onStart)
  }

  async start() {
    await mongoConnection.connect(settings.mongoUri, settings.mongoDatabase)
    await this.bot.launch()
  }

  async stop() {
    await this.bot.stop()
  }
}

if (import.meta.main) {
  const listener = new TelegramBotListener(settings.telegramBotToken)
  listener.setupEvents()
  listener.start()
}

export { TelegramBotListener }
