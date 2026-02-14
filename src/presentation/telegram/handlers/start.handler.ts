import type { Context } from 'telegraf'
import { logger } from '@/infrastructure/adapters/logger.adapter'
import { createUserCommand } from '@/application/use-cases/user/create-user.command'
import { AllowancePreset } from '@/application/use-cases/user/allowance-preset'
import { START_TEXT, ALREADY_REGISTERED_TEXT } from './texts'
import { EmailRegisteredError } from '@/application/use-cases/user/create-user.command'
import type { UserDTO } from '@/users/presentation/dto/user.dto'
import { AllowanceCodes } from '@/application/ports/allowance-codes'
import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { UserQueryExecutorFacade } from '@/infrastructure/facade/user-query-executor.facade'
import { UserQueryBuilder as Q } from '@/users/application/ports/user-query-spec.port'

const log = logger.child('StartHandler')

/**
 * Создаёт пользователя если нового, возвращает user + текст приветствия.
 * Используется в renderStart (bot-router).
 */
export async function ensureUser(ctx: Context): Promise<{
  user: Omit<UserDTO, 'password'> | undefined
  replyText: string
}> {
  const from = ctx.from
  if (!from) return { user: undefined, replyText: 'Ошибка: не удалось определить пользователя' }

  const startPayload = ctx.message && 'text' in ctx.message
    ? ctx.message.text.split(' ')[1]
    : null

  log.info('User started bot', {
    userId: from.id,
    username: from.username,
    payload: startPayload,
  })

  let user: Omit<UserDTO, 'password'> | undefined
  let isNewUser = false

  try {
    const created = await createUserCommand({
      email: `tguser.${from.id}@noreply.smartbuild.ru`,
      password: Math.random().toString(36).slice(-8),
      extra: {
        telegramId: from.id,
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        subscribedToChannel: false,
        phoneNumber: null,
      },
      allowances: [], // Создаём пользователя БЕЗ allowances
    })
    if (created) {
      user = created.user
      isNewUser = true
    }
  } catch(error) {
    if (error instanceof EmailRegisteredError) {
      user = error.existingUser
      isNewUser = false
    } else {
      throw error
    }
  }

  // Проверяем и назначаем базовый allowance (если нет)
  if (user) {
    const baseAllowanceCode = AllowanceCodes.canGenerate3DPlan
    const hasBaseAllowance = user.allowances?.some(a => a.code === baseAllowanceCode)

    if (!hasBaseAllowance) {
      // Первый старт — назначаем базовый allowance
      const userService = UserServiceFacade.getInstance()
      const allowances = AllowancePreset.FREE()

      await userService.assignAllowances(user.id, allowances)

      log.info('Base allowance assigned', { userId: user.id })

      // Перечитываем пользователя из базы для получения актуальных данных
      const executor = UserQueryExecutorFacade.getInstance()
      const query = Q.extraEquals('telegramId', from.id)
      const updatedUserEntity = await executor.executeOne(query)

      if (updatedUserEntity) {
        const updatedUserDto = await userService.findById(updatedUserEntity.id)
        if (updatedUserDto) {
          user = updatedUserDto
        }
      }
    } else {
      log.info('Base allowance already claimed, skipping', { userId: user.id })
    }
  }

  const currentLimit = user?.allowances?.find(a => a.code === AllowanceCodes.canGenerate3DPlan)?.quantityRemaining ?? 0

  const replyText = isNewUser || !user?.allowances?.length
    ? START_TEXT({
        currentLimit: 1,
        subscribeBonusLimit: 3,
        orderBonusLimit: 10,
      })
    : ALREADY_REGISTERED_TEXT({
        currentLimit,
      })

  return { user, replyText }
}
