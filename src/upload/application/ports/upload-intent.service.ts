import { UploadIntentEntity } from '@domain/entities/upload-intent.entity'

export type CreateUploadIntentOptions = {
  expiresAt?: Date | null
  sizeLimit?: number | null
  mimeType?: string | null
}

export type ConfirmUploadIntentMetadata = {
  originalName: string
  originalExtension: string
  assetType?: string | null
  customMetadata?: Record<string, any>
}

export interface UploadIntentServicePort {
  createIntent(options: CreateUploadIntentOptions): Promise<UploadIntentEntity>

  validateIntent(intentId: string): Promise<void>

  confirmIntent(intentId: string, metadata: ConfirmUploadIntentMetadata): Promise<UploadIntentEntity>

  getIntent(intentId: string): Promise<UploadIntentEntity | null>
}
