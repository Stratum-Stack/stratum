import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { logger } from '@/infrastructure/adapters/logger.adapter'

const log = logger.child('[ RegisterUserCommand ]')

export type RegisterUserCommandInput = {
  username: string
  lastName: string
  firstName: string
  telegramUserId: string | number
}

export async function registerUserCommand(input: RegisterUserCommandInput): Promise<void> {
  const tempEmail = `tguser.${input.telegramUserId}@noreply.example.com`
  const tempPassword = Math.random().toString(36).slice(-8)
  const userService = UserServiceFacade.getInstance()
  const user = await userService.findByEmail(tempEmail)

  if (user) {
    log.info('User already exists', { userId: input.telegramUserId, username: input.username })
    return
  }

  await userService.create({
    email: tempEmail,
    password: tempPassword,
    extra: {
      telegram: input.username,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  })
}
