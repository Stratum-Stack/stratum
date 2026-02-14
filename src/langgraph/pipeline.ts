import type { Context } from 'telegraf'
import type { LangGraphContext } from './context.type'
import { downloadImageNode } from './nodes/download-image.node'
import { preparePromptNode } from './nodes/prepare-prompt.node'
import { generateImageNode } from './nodes/generate-image.node'

/**
 * Simplified pipeline without LangGraph
 * Executes nodes sequentially with shared state
 */
export async function runPipeline(ctx: Context): Promise<void> {
  if (!ctx.message || !('photo' in ctx.message)) {
    throw new Error('No photo in message')
  }

  const photos = ctx.message.photo
  const largestPhoto = photos[photos.length - 1]

  // Initialize state
  let state: LangGraphContext = {
    ctx,
    userImageUploaded: {
      fileId: largestPhoto.file_id
    }
  }

  try {
    // Execute pipeline nodes sequentially
    // Each node receives full state and returns partial updates

    // 1. Download image
    const downloadResult = await downloadImageNode(state)
    state = { ...state, ...downloadResult }

    // 2. Prepare prompt
    const prepareResult = await preparePromptNode(state)
    state = { ...state, ...prepareResult }

    // 3. Generate image
    const generateResult = await generateImageNode(state)
    state = { ...state, ...generateResult }

    console.log('[Pipeline] ✅ Completed successfully')
  } catch (error) {
    console.error('[Pipeline] ❌ Error:', error)
    throw error
  }
}

/**
 * Legacy function for compatibility
 * Can be used if we want to re-add LangGraph later
 */
export function createImageProcessingPipeline() {
  console.warn('[Pipeline] Using simplified sequential execution instead of LangGraph')
  return {
    invoke: async (initialState: Partial<LangGraphContext>) => {
      if (!initialState.ctx) {
        throw new Error('ctx is required')
      }
      return runPipeline(initialState.ctx)
    }
  }
}
