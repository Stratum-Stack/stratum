import { AuthServiceFacade } from '@/infrastructure/facade/auth-service.facade'
import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { type UserDTO } from '@/users/presentation/dto/user.dto'
import { type AllowanceInput } from '@/users/application/ports/user-service.port'

type CreateUserInput = {
  email: string
  password: string
  allowances?: AllowanceInput[]
}
export class EmailRegisteredError extends Error {
  constructor() {
    super('Email already registered')
  }
}

export class UserNotCreatedError extends Error {
  constructor() {
    super('User not created')
  }
}

export async function createUserCommand(input: CreateUserInput): Promise<null | { user: Omit<UserDTO, 'password'>, tokens: { accessToken: string, refreshToken: string } }> {
  const authService = AuthServiceFacade.getInstance()
  const userService = UserServiceFacade.getInstance()

  const existingUser = await userService.findByEmail(input.email)

  if (existingUser) {
    throw new EmailRegisteredError()
  }

  const hashed = await authService.generatePasswordHash(input.password)

  const user = await userService.create({
    email: input.email,
    password: hashed,
    allowances: input.allowances ?? [],
  })

  if (!user) {
    throw new UserNotCreatedError()
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
