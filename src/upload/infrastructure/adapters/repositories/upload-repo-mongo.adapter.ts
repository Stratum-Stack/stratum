import { type Model, type Mongoose } from 'mongoose'
import { type UploadRepoPort } from '@application/ports/upload-repository.port'
import { UploadFileEntity } from '@domain/entities/upload-file.entity'
import { UploadSavingError } from '@infrastructure/exceptions/upload-saving.exception'
import { UploadNotFoundError } from '@infrastructure/exceptions/upload-not-found.exceptions'
import { getUploadModel, type UploadDocument } from '@infrastructure/models/upload.model'

export class UploadRepoMongoAdapter implements UploadRepoPort {
  private UploadModel: Model<UploadDocument>

  constructor(mongoClient: Mongoose) {
    this.UploadModel = getUploadModel(mongoClient)
  }

  private mapToUpload(doc: UploadDocument): UploadFileEntity {
    return UploadFileEntity.fromPersistence({
      id: doc.id,
      size: doc.size,
      mimeType: doc.mimeType,
      storageKey: doc.storageKey,
      originalName: doc.originalName,
      originalExtension: doc.originalExtension,
      assetType: doc.assetType,
      customMetadata: doc.customMetadata || {},
      createdAt: new Date(doc.createdAt),
      deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
      lastModified: doc.lastModified ? new Date(doc.lastModified) : null,
    })
  }

  async save(upload: UploadFileEntity): Promise<UploadFileEntity> {
    const result = await this.UploadModel.findOneAndUpdate({
      id: upload.id,
    }, {
      id: upload.id,
      storageKey: upload.storageKey,
      size: upload.size,
      mimeType: upload.mimeType,
      originalName: upload.originalName,
      originalExtension: upload.originalExtension,
      assetType: upload.assetType,
      customMetadata: upload.customMetadata,
      createdAt: upload.createdAt,
      deletedAt: upload.deletedAt,
      lastModified: upload.lastModified ?? upload.createdAt,
    }, {
      upsert: true,
      new: true,
      runValidators: true,
    })

    if (!result) {
      throw new UploadSavingError(upload)
    }

    return upload
  }

  async findById(id: string): Promise<UploadFileEntity | null> {
    const doc = await this.UploadModel.findOne({ id })
    return doc ? this.mapToUpload(doc) : null
  }

  async findByStorageKey(storageKey: string): Promise<UploadFileEntity | null> {
    const doc = await this.UploadModel.findOne({ storageKey })
    return doc ? this.mapToUpload(doc) : null
  }

  async findByPrefix(prefix: string): Promise<UploadFileEntity[]> {
    const docs = await  this.UploadModel.find({ storageKey: { $regex: `^${prefix}` } })
    return docs.map(doc => this.mapToUpload(doc))
  }

  async delete(id: string): Promise<UploadFileEntity> {
    const original = await this.UploadModel.findById(id)
    if (!original) {
      throw new UploadNotFoundError(id)
    }

    const originalEntity = this.mapToUpload(original)

    original.deletedAt = new Date()
    await original.save()
    originalEntity.delete()

    return originalEntity
  }

  async findAll(page: number, perPage: number): Promise<{ uploads: UploadFileEntity[]; total: number; }> {
    const skip = (page - 1) * perPage

    const [docs, total] = await Promise.all([
      this.UploadModel.find({}).skip(skip).limit(perPage).exec(),
      this.UploadModel.countDocuments({}).exec(),
    ])

    const uploads = docs.map(doc => this.mapToUpload(doc))

    return { uploads, total }
  }
}
