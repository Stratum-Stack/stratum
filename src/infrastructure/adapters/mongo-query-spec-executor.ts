import { type QuerySpecExecutorPort, type QuerySpecPort } from '@application/ports/query-spec-executor'
import { Query } from 'mongoose'

export class QuerySpecExecutor implements QuerySpecExecutorPort {
  async query<T>(spec: QuerySpecPort): Promise<T> {
    const results = await spec.toQuery<Query<T, any>>().exec()
    return results as T
  }
}
