import { AuthServiceFacade } from '@/infrastructure/facade/auth-service.facade'
import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { type UserDTO } from '@/users/presentation/dto/user.dto'

type AuthorizeUserCommandFields = {
  email: string
  password: string
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials')
  }
}

export async function authorizeUserCommand(
  fields: AuthorizeUserCommandFields,
): Promise<null | { user: Omit<UserDTO, 'password'>, tokens: { accessToken: string, refreshToken: string } }> {
  const authService = AuthServiceFacade.getInstance()
  const userService = UserServiceFacade.getInstance()

  const user = await userService.findByEmail(fields.email)

  if (!user) {
    throw new InvalidCredentialsError()
  }

  const isPasswordValid = await authService.comparePassword(fields.password, user.password)
  if (!isPasswordValid) {
    throw new InvalidCredentialsError()
  }

  const tokens = authService.issueTokens(user.id, {
    allowances: user.allowances,
    email: user.email,
    licenseAcceptedAt: user.licenseAcceptedAt,
  })

  const { password: _, ...userWithoutPassword } = user

  return {
    user: userWithoutPassword,
    tokens: {
      accessToken: tokens.accessToken.value,
      refreshToken: tokens.refreshToken.value,
    },
  }
}
