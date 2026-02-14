import type { LangGraphContext } from '../context.type'
import { OpenRouterClient } from '../openrouter.client'

export async function generateImageNode(state: LangGraphContext): Promise<Partial<LangGraphContext>> {
  await state.ctx.reply('🎨 Генерирую изображение через Nano Banana...')

  if (!state.prompt) {
    throw new Error('No prompt available')
  }

  if (!state.userImageUploaded?.fileUrl) {
    throw new Error('No source image URL available')
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set')
  }

  const client = new OpenRouterClient(apiKey)

  try {
    const generatedImageUrl = await client.generateImage(
      state.prompt,
      state.userImageUploaded.fileUrl
    )

    // Convert base64 to Buffer for Telegram (avoids size limits)
    let imageSource: string | Buffer = generatedImageUrl

    if (generatedImageUrl.startsWith('data:image/')) {
      // Extract base64 data
      const base64Data = generatedImageUrl.split(',')[1]
      if (base64Data) {
        console.log('[GenerateNode] Converting base64 to Buffer')
        imageSource = Buffer.from(base64Data, 'base64')
      }
    }

    // Send result to user
    await state.ctx.replyWithPhoto(
      { source: imageSource } as any,
      { caption: '✅ Готово! Вот ваше сгенерированное изображение.' }
    )

    return {
      generatedImageUrl,
      currentStep: 'completed'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await state.ctx.reply(`❌ Ошибка при генерации: ${errorMessage}`)
    throw error
  }
}
