import { type QuerySpecExecutorPort } from '@application/ports/query-spec-executor'
import { QuerySpecExecutor } from '@infrastructure/adapters/mongo-query-spec-executor'

export class QuerySpecExecutorFacade {
  private static instance: QuerySpecExecutor

  private constructor() {}

  static getInstance(): QuerySpecExecutorPort {
    if (!QuerySpecExecutorFacade.instance) {
      QuerySpecExecutorFacade.instance = new QuerySpecExecutor()
    }
    return QuerySpecExecutorFacade.instance
  }
}
