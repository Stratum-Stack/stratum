import { UploadFileEntity } from '@domain/entities/upload-file.entity'

export interface UploadRepoPort {
  save(upload: UploadFileEntity): Promise<UploadFileEntity>
  delete(id: string): Promise<UploadFileEntity>
  findById(id: string): Promise<UploadFileEntity | null>
  findByStorageKey(storageKey: string): Promise<UploadFileEntity | null>
  findByPrefix(prefix: string): Promise<UploadFileEntity[]>
  findAll(page: number, perPage: number): Promise<{ uploads: UploadFileEntity[], total: number }>
}
