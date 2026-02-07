import { TelegramBotListener } from './bot'
import { logger } from '@/infrastructure/adapters/logger.adapter'

const log = logger.child('TelegramBot:Container')

export class BotInitializer {
  private botListener: TelegramBotListener | null = null
  private token: string | null = null

  private createBot() {
    if (this.token) {
      this.botListener = new TelegramBotListener(this.token)
    }
  }

  private async start() {
    this.createBot()
    await this.botListener!.start()
  }
}
