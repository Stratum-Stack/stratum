import { Schema, type Model, type Document, type Mongoose } from 'mongoose'

export interface SettingsDocument extends Document {
  key: string
  value: string
}

const SettingsSchema = new Schema<SettingsDocument>({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
})

export function getSettingsModel(db: Mongoose): Model<SettingsDocument> {
  try {
    return db.model<SettingsDocument>('Settings')
  } catch (error) {
    return db.model<SettingsDocument>('Settings', SettingsSchema)
  }
}
