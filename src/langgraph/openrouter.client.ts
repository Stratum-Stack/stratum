import OpenAI from 'openai'

export class OpenRouterClient {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': process.env.APP_NAME || 'FloorPlan Processor'
      }
    })
  }

  async generateImage(prompt: string, sourceImageUrl?: string): Promise<string> {
    // Build content array - include source image for transformation
    const content: any[] = [{ type: 'text', text: prompt }]

    if (sourceImageUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: sourceImageUrl }
      })
    }

    // Use Nano Banana Pro (Gemini 3 Pro Image) which supports image-to-image
    const response = await this.client.chat.completions.create({
      model: 'google/gemini-3-pro-image-preview',
      messages: [{
        role: 'user',
        content
      }],
      // Specify that we want image output
      extra_body: {
        modalities: ['image', 'text']
      }
    })

    console.log('[OpenRouter] Response received')

    const message = response.choices[0]?.message as any

    // Check for images field (OpenRouter standard format)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const firstImage = message.images[0]
      if (firstImage?.image_url?.url) {
        const base64Url = firstImage.image_url.url
        console.log('[OpenRouter] Found image in standard format, length:', base64Url.length)
        return base64Url
      }
    }

    // Fallback: check content_parts (alternative format)
    const contentParts = message?.content_parts
    if (contentParts && Array.isArray(contentParts)) {
      const imagePart = contentParts.find((part: any) =>
        part.type === 'image_url' && part.image_url?.url
      )
      if (imagePart) {
        console.log('[OpenRouter] Found image in content_parts')
        return imagePart.image_url.url
      }
    }

    // Last resort: parse from text content
    const textContent = message?.content
    if (typeof textContent === 'string') {
      const imageUrlMatch = textContent.match(/(data:image\/[^;]+;base64,[^\s"')]+)/i) ||
                           textContent.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif))/i)
      if (imageUrlMatch && imageUrlMatch[1]) {
        console.log('[OpenRouter] Found image URL in text content')
        return imageUrlMatch[1]
      }
    }

    console.error('[OpenRouter] Full response:', JSON.stringify(response, null, 2))
    throw new Error('Could not extract image from OpenRouter response')
  }
}
