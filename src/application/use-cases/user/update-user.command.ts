import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { type UserDTO } from '@/users/presentation/dto/user.dto'
import { type AllowanceInput } from '@/users/application/ports/user-service.port'
import { type UserProfilePort } from '@/application/ports/user-profile.port'

type UpdateUserInput = {
  extra?: Partial<UserProfilePort>
  allowances?: AllowanceInput[]  // Примитивы вместо Allowance VO
}

export class UserNotFoundError extends Error {
  constructor() {
    super('User not found')
  }
}

export async function updateUserCommand(
  id: string,
  input: UpdateUserInput
): Promise<{ user: Omit<UserDTO<UserProfilePort>, 'password'> }> {
  const userService = UserServiceFacade.getInstance()

  const user: UserDTO<UserProfilePort> = await userService.updateUser(id, input)
  if (!user) {
    throw new UserNotFoundError()
  }

  const { password: _, ...userWithoutPassword } = user

  return {
    user: userWithoutPassword
  }
}
