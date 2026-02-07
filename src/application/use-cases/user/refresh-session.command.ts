import { AuthServiceFacade } from '@/infrastructure/facade/auth-service.facade'
import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { type UserDTO } from '@/users/presentation/dto/user.dto'

export class CorruptedRefreshToken extends Error {
  constructor() {
    super('Corrupted refresh token')
  }
}

export async function refreshSessionCommand(refreshToken: string): Promise<null | { user: Omit<UserDTO, 'password'>, tokens: { accessToken: string, refreshToken: string } }> {
  const authService = AuthServiceFacade.getInstance()
  const userService = UserServiceFacade.getInstance()

  const isValidToken = authService.verifyToken(refreshToken)

  if (!isValidToken) {
    throw new CorruptedRefreshToken()
  }

  const decodedToken = authService.decodeToken<{
     sub: string,
     email: string,
     allowances: any[],
     licenseAcceptedAt: number
  }>(refreshToken)

  if (!decodedToken) {
    throw new CorruptedRefreshToken()
  }

  const user = await userService.findById(decodedToken.sub)

  if (!user) {
    throw new CorruptedRefreshToken()
  }

  authService.refreshTokens(refreshToken, decodedToken.sub, {
    allowances: decodedToken.allowances,
    email: decodedToken.email,
    licenseAcceptedAt: decodedToken.licenseAcceptedAt,
  })

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
