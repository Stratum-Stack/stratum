import { Schema, type Model, type Document, type Mongoose } from 'mongoose'

export interface AllowanceDocument extends Document {
  code: string
  quantity: number
  isUnlimited: boolean
  expiresAt?: Date
  quantityUsed: number
}

export interface UserDocument extends Document {
  id: string
  licenseAcceptedAt?: Date
  email: string
  password: string
  deletedAt?: Date
  createdAt: Date
  allowances: AllowanceDocument[]
  extra?: Record<string, any>
}

const AllowanceDoc = new Schema<AllowanceDocument>({
  code: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  isUnlimited: { type: Boolean, default: false },
  expiresAt: { type: Date },
  quantityUsed: { type: Number, default: 0 },
})

const UserSchema = new Schema<UserDocument>({
  id: { type: String, required: true, unique: true },
  licenseAcceptedAt: { type: Date },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  deletedAt: { type: Date },
  createdAt: { type: Date, required: true },
  allowances: { type: [AllowanceDoc], default: [] },
  extra: { type: Schema.Types.Mixed, default: {} },
})

/**
 * Get or create User model
 * This function ensures the model is registered only once
 */
export function getUserModel(db: Mongoose): Model<UserDocument> {
  try {
    // Try to get existing model
    return db.model<UserDocument>('User')
  } catch (error) {
    // Model doesn't exist, create it
    return db.model<UserDocument>('User', UserSchema)
  }
}
