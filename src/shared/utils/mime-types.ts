export const MIME_TO_EXTENSION: Record<string, string> = {
  // Audio
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/x-aac': 'aac',
  'audio/aiff': 'aiff',
  'audio/x-aiff': 'aiff',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/opus': 'opus',

  // Images
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',

  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',

  // Documents
  'application/pdf': 'pdf',
  'application/json': 'json',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'application/javascript': 'js',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
}

export function getExtensionFromMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(';')[0]?.trim() || ''
  return MIME_TO_EXTENSION[normalized] || 'bin'
}

export function getMimeTypeFromExtension(extension: string): string | null {
  const ext = extension.toLowerCase().replace(/^\./, '')

  for (const [mime, fileExt] of Object.entries(MIME_TO_EXTENSION)) {
    if (fileExt === ext) {
      return mime
    }
  }

  return null
}
