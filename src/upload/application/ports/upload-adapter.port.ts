import { PresignedUrl } from '@domain/value-objects/presigned-url.value-object'

export interface UploadResult {
  id: string
  key: string
  size: number
  mimeType: string
  lastModified: Date
}

export interface UploadAdapterPort {
  uploadFile(file: File, prefix?: string): Promise<UploadResult>
  uploadFileFromUrl(url: string, prefix?: string): Promise<UploadResult>
  deleteFile(key: string): Promise<void>
  generatePresignedUrl(key: string, fileId: string, expiresIn?: number): Promise<PresignedUrl>
  generateDownloadUrl(key: string, expiresIn?: number): Promise<PresignedUrl>
  getPublicUrl(key: string): string
  getFileMetadata(key: string): Promise<UploadResult | null>
  listFiles(prefix?: string): Promise<UploadResult[]>
  renameFile(oldKey: string, newKey: string): Promise<void>
}
