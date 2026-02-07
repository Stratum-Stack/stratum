import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { type UserDTO } from '@/users/presentation/dto/user.dto'
import { type UserProfilePort } from '@/application/ports/user-profile.port'

export async function deleteUserCommand(
  id: string,
): Promise<null | { user: Omit<UserDTO<UserProfilePort>, 'password'> }> {
  const userService = UserServiceFacade.getInstance()

  const user: UserDTO<UserProfilePort> = await userService.deleteUser(id)
  if (!user) {
    return null
  }

  const { password: _, ...userWithoutPassword } = user

  return {
    user: userWithoutPassword
  }
}
