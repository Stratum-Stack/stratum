import { type UserQuery } from '@application/ports/user-query-spec.port'
import { MongoUserQueryConverter } from './mongo-user-query-converter'
import { User } from '@domain/entities/user.entity'
import { Email } from '@domain/value-objects/email.value-object'
import { Allowance } from '@domain/value-objects/allowance.value-object'
import { type Mongoose, type Model } from 'mongoose'
import { getUserModel, type UserDocument } from '@infrastructure/models/user.model'

export class MongoUserQueryExecutor {
  private readonly converter = new MongoUserQueryConverter()
  private readonly UserModel: Model<UserDocument>

  constructor(db: Mongoose) {
    this.UserModel = getUserModel(db)
  }

  async execute(query: UserQuery, page: number = 1, limit: number = 100): Promise<{ data: User[], total: number }> {
    const mongoQuery = this.converter.convert(query)
    const skip = (page - 1) * limit

    const [results, total] = await Promise.all([
      this.UserModel.find(mongoQuery)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.UserModel.countDocuments(mongoQuery).exec()
    ])

    return {
      data: results.map(doc => this.mapDocumentToEntity(doc)),
      total
    }
  }

  async executeOne(query: UserQuery): Promise<User | null> {
    const mongoQuery = this.converter.convert(query)
    const doc = await this.UserModel.findOne(mongoQuery).exec()

    if (!doc) return null

    return this.mapDocumentToEntity(doc)
  }

  async count(query: UserQuery): Promise<number> {
    const mongoQuery = this.converter.convert(query)
    return this.UserModel.countDocuments(mongoQuery).exec()
  }

  private mapDocumentToEntity(doc: any): User {
    return User.fromPersistence({
      id: doc.id,
      email: new Email(doc.email),
      password: doc.password,
      allowances: doc.allowances?.map((a: any) =>
        new Allowance(a.code, a.expiresAt, a.quantity, a.quantityUsed, a.isUnlimited)
      ) || [],
      createdAt: doc.createdAt,
      deletedAt: doc.deletedAt,
      licenseAcceptedAt: doc.licenseAcceptedAt,
      extra: doc.extra || {}
    })
  }
}
