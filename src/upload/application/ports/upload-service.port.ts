import { UploadFileEntity } from '@domain/entities/upload-file.entity'
import { UploadDto } from '../../presentation/upload.dto'
import { PresignedUrl } from '@domain/value-objects/presigned-url.value-object'
import { type UploadAdapterPort } from './upload-adapter.port'
import { type EventBusPort } from './event-bus.port'
import { type UploadRepoPort } from './upload-repository.port'

export abstract class UploadServicePort {
  public readonly eventBus: EventBusPort
  public readonly uploadAdapter: UploadAdapterPort
  public readonly uploadRepo: UploadRepoPort

  constructor(
    eventBus: EventBusPort,
    uploadAdapter: UploadAdapterPort,
    uploadRepo: UploadRepoPort,
  ) {
    this.eventBus = eventBus
    this.uploadAdapter = uploadAdapter
    this.uploadRepo = uploadRepo
  }

  abstract uploadFile(
    file: File,
    options?: {
      prefix?: string
      assetType?: string | null
      customMetadata?: Record<string, any>
    }
  ): Promise<UploadDto>
  abstract uploadFileFromUrl(
    url: string,
    options?: {
      prefix?: string
      assetType?: string | null
      customMetadata?: Record<string, any>
    }
  ): Promise<UploadDto>
  abstract deleteFile(file: UploadFileEntity): Promise<UploadDto>
  abstract deleteFileByKey(storageKey: string): Promise<UploadDto | null>
  abstract getFile(storageKey: string): Promise<UploadDto | null>
  abstract getFileById(id: string): Promise<UploadDto | null>
  abstract listFiles(prefix?: string): Promise<UploadDto[]>
  abstract getFileMetadata(storageKey: string): Promise<UploadDto | null>
  abstract trackUpload(uploadFile: UploadFileEntity): Promise<UploadDto>
  abstract renameFile(oldKey: string, newKey: string): Promise<void>
  abstract updateFileMetadata(storageKey: string, metadata: Record<string, string>): Promise<void>
  abstract generateDownloadUrl(storageKey: string, expiresIn?: number): Promise<PresignedUrl>
  abstract getPublicUrl(storageKey: string): Promise<string>
}
