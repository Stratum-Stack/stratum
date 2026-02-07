/**
 * Deep link parameter guards and parsers
 */

export type DownloadLinkParams = {
  type: 'download'
  packId: string
  channelId: string
}

export type DeepLinkParams = DownloadLinkParams | null

/**
 * Type guard: checks if payload is a valid download link
 * Format: download_<packId>_<channelId>
 */
export function isDownloadLink(payload: string | null | undefined): payload is string {
  if (!payload) return false

  if (!payload.startsWith('download_')) return false

  const params = payload.replace('download_', '').split('_')

  // Must have exactly 2 parts: packId and channelId
  if (params.length !== 2) return false

  // Both parts must be non-empty
  const [packId, channelId] = params
  return !!packId && !!channelId
}

/**
 * Parse download link parameters
 * Returns null if invalid format
 */
export function parseDownloadLink(payload: string): DownloadLinkParams | null {
  if (!isDownloadLink(payload)) return null

  const params = payload.replace('download_', '').split('_')
  const [packId, channelId] = params

  // Type narrowing: isDownloadLink already validated that both exist
  if (!packId || !channelId) return null

  return {
    type: 'download',
    packId,
    channelId,
  }
}

/**
 * Parse any deep link payload
 * Returns typed params based on the deep link type
 */
export function parseDeepLink(payload: string | null | undefined): DeepLinkParams {
  if (!payload) return null

  if (isDownloadLink(payload)) {
    return parseDownloadLink(payload)
  }

  // Add more deep link types here as needed
  // if (isInviteLink(payload)) { ... }
  // if (isChannelLink(payload)) { ... }

  return null
}
