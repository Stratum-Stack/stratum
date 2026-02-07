import { UserQueryExecutorFactory } from '@users/infrastructure/factory/user-query-executor.factory'
import { MongoConnection } from '@infrastructure/adapters/mongo'
import { type MongoUserQueryExecutor } from '@users/infrastructure/adapters/query/mongo-user-query-executor'

/**
 * Facade для User Query Executor
 *
 * Singleton pattern - создаёт единственный экземпляр executor'а
 */
export class UserQueryExecutorFacade {
  private static instance: MongoUserQueryExecutor

  private constructor() {}

  static getInstance(): MongoUserQueryExecutor {
    if (!UserQueryExecutorFacade.instance) {
      const db = MongoConnection.getInstance().getDb()
      UserQueryExecutorFacade.instance = UserQueryExecutorFactory.create(db)
    }
    return UserQueryExecutorFacade.instance
  }
}
