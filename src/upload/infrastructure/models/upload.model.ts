import { Schema, type Model, type Document, type Mongoose } from 'mongoose'

export interface UploadDocument extends Document {
  id: string
  storageKey: string
  size: number
  mimeType: string
  originalName: string
  originalExtension: string
  assetType: string | null
  customMetadata: Record<string, string>
  deletedAt: Date | null
  createdAt: Date
  lastModified?: Date | null
}

const UploadSchema = new Schema<UploadDocument>({
  id: { type: String, required: true, unique: true },
  storageKey: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  originalName: { type: String, required: true },
  originalExtension: { type: String, required: true },
  assetType: { type: String, required: false, default: null },
  customMetadata: { type: Object, required: true, default: {} },
  createdAt: { type: Date, required: true },
  deletedAt: { type: Date, required: false, default: null },
  lastModified: { type: Date, required: false },
})

/**
 * Get or create Upload model
 * This function ensures the model is registered only once
 */
export function getUploadModel(db: Mongoose): Model<UploadDocument> {
  try {
    // Try to get existing model
    return db.model<UploadDocument>('Upload')
  } catch (error) {
    // Model doesn't exist, create it
    return db.model<UploadDocument>('Upload', UploadSchema)
  }
}
