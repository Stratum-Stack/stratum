import { type Mongoose } from 'mongoose'
import { MongoUserQueryExecutor } from '@infrastructure/adapters/query/mongo-user-query-executor'

export class UserQueryExecutorFactory {
  static create(mongoClient: Mongoose) {
    return new MongoUserQueryExecutor(mongoClient)
  }
}
