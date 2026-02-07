import { UserQueryExecutorFacade } from '@infrastructure/facade/user-query-executor.facade'
import { UserQueryBuilder as Q } from '@users/application/ports/user-query-spec.port'
import { UserDTO } from '@users/presentation/dto/user.dto'

export type findUsersQueryParams = {
  email: string
}

export async function findUsersQuery(
  params: findUsersQueryParams,
  filter = { page: 1, perPage: 50 }
): Promise<{ data: UserDTO[], total: number }> {
  const executor = UserQueryExecutorFacade.getInstance()

  const query = Q.and(
    Q.email(params.email)
  )
  const result = await executor.execute(query, filter.page, filter.perPage)

  return {
    data: result.data.map(user => UserDTO.fromEntity(user)),
    total: result.total
  }
}
