import type { Context } from 'telegraf'

export interface UserImageUploaded {
  fileId: string
  fileUrl?: string
  buffer?: Buffer
}

export interface LangGraphContext {
  // Telegram context (contains bot API via ctx.telegram)
  ctx: Context

  // User input
  userImageUploaded?: UserImageUploaded

  // Processing
  prompt?: string
  generatedImageUrl?: string

  // State
  currentStep?: string
  error?: string
}
