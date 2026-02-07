import { UserQueryExecutorFacade } from '@infrastructure/facade/user-query-executor.facade'
import { UserQueryBuilder as Q } from '@users/application/ports/user-query-spec.port'

export async function findAdminQuery(params: { email: string }) {
  const executor = UserQueryExecutorFacade.getInstance()

  const query = Q.and(
    Q.hasAllowance('canManageAll'),
    Q.email(params.email)
  )
  const result = await executor.executeOne(query)
  return result
}
