import type { LangGraphContext } from '../context.type'

export async function downloadImageNode(state: LangGraphContext): Promise<Partial<LangGraphContext>> {
  if (!state.ctx) {
    throw new Error('Missing required ctx in state')
  }

  await state.ctx.reply('⏳ Загружаю изображение...')

  if (!state.userImageUploaded?.fileId) {
    throw new Error('No file ID provided')
  }

  const file = await state.ctx.telegram.getFile(state.userImageUploaded.fileId)
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not set')
  }

  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`

  // Download file as buffer
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return {
    userImageUploaded: {
      ...state.userImageUploaded,
      fileUrl,
      buffer
    },
    currentStep: 'downloaded'
  }
}
