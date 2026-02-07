import { type UserRepoPort } from '@application/ports/user-repository.port'
import { type Mongoose, type Model } from 'mongoose'
import { User } from '@domain/entities/user.entity'
import { Email } from '@domain/value-objects/email.value-object'
import { Allowance } from '@domain/value-objects/allowance.value-object'
import { getUserModel, type UserDocument } from '@infrastructure/models/user.model'

export class UserRepoMongoAdapter implements UserRepoPort {
  private UserModel: Model<UserDocument>

  constructor(mongoClient: Mongoose) {
    this.UserModel = getUserModel(mongoClient)
  }

  async save<T extends Record<string, any> = Record<string, any>>(user: User<T>): Promise<User<T>> {
    const result = await this.UserModel.findOneAndUpdate(
      { id: user.id },
      {
        id: user.id,
        email: user.email.value,
        password: user.password,
        licenseAcceptedAt: user.licenseAcceptedAt,
        deletedAt: user.deletedAt,
        createdAt: user.createdAt,
        allowances: user.allowances.map(allowance => ({
          code: allowance.allowanceCode,
          quantity: allowance.totalQuantity,
          isUnlimited: allowance.isUnlimited,
          expiresAt: allowance.allowanceExpiresAt,
          quantityUsed: allowance.totalQuantity - allowance.remainingQuantity
        })),
        extra: user.extra
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    )

    if (!result) {
      throw new Error('Failed to save user')
    }

    return user
  }

  private mapDocumentToUser<T extends Record<string, any> = Record<string, any>>(doc: UserDocument): User<T> {
    const allowances = doc.allowances.map((allowanceDoc: any) =>
      new Allowance(
        allowanceDoc.code,
        allowanceDoc.expiresAt,
        allowanceDoc.quantity,
        allowanceDoc.quantityUsed,
        allowanceDoc.isUnlimited
      )
    )

    return User.fromPersistence<T>({
      id: doc.id,
      email: new Email(doc.email),
      password: doc.password,
      allowances,
      createdAt: doc.createdAt,
      deletedAt: doc.deletedAt ?? null,
      licenseAcceptedAt: doc.licenseAcceptedAt ?? null,
      extra: (doc.extra ?? {}) as T
    })
  }

  async findById<T extends Record<string, any> = Record<string, any>>(id: string): Promise<User<T> | null> {
    const doc = await this.UserModel.findOne({ id }).exec()
    return doc ? this.mapDocumentToUser<T>(doc) : null
  }

  async findByEmail<T extends Record<string, any> = Record<string, any>>(email: Email): Promise<User<T> | null> {
    const doc = await this.UserModel.findOne({ email: email.value }).exec()
    return doc ? this.mapDocumentToUser<T>(doc) : null
  }

  async update<T extends Record<string, any> = Record<string, any>>(id: string, userData: Partial<User<T>>): Promise<User<T>> {
    const updateData: any = {}

    if (userData.email) updateData.email = userData.email.value
    if (userData.password) updateData.password = userData.password
    if (userData.licenseAcceptedAt !== undefined) updateData.licenseAcceptedAt = userData.licenseAcceptedAt
    if (userData.deletedAt !== undefined) updateData.deletedAt = userData.deletedAt
    if (userData.allowances) {
      updateData.allowances = userData.allowances.map(allowance => ({
        code: allowance.allowanceCode,
        quantity: allowance.totalQuantity,
        isUnlimited: allowance.isUnlimited,
        expiresAt: allowance.allowanceExpiresAt,
        quantityUsed: allowance.totalQuantity - allowance.remainingQuantity
      }))
    }
    if (userData.extra !== undefined) updateData.extra = userData.extra

    const doc = await this.UserModel.findOneAndUpdate(
      { id },
      updateData,
      { new: true, runValidators: true }
    ).exec()

    if (!doc) {
      throw new Error(`User with id ${id} not found`)
    }

    return this.mapDocumentToUser<T>(doc)
  }

  async delete<T extends Record<string, any> = Record<string, any>>(id: string): Promise<User<T>> {
    const user = await this.UserModel.findOne({ id })
    if (!user) {
      throw new Error(`User with id ${id} not found`)
    }

    const originalEntity = this.mapDocumentToUser<T>(user)

    user.deletedAt = new Date()
    await user.save()

    return originalEntity
  }

  async findAll<T extends Record<string, any> = Record<string, any>>(page: number, perPage: number): Promise<{ users: User<T>[]; total: number }> {
    const skip = (page - 1) * perPage

    const [docs, total] = await Promise.all([
      this.UserModel.find({}).skip(skip).limit(perPage).exec(),
      this.UserModel.countDocuments({}).exec()
    ])

    const users = docs.map(doc => this.mapDocumentToUser<T>(doc))
    return { users, total }
  }
}
