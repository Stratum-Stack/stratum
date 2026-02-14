import { type Context } from 'telegraf'
import { updateUserCommand } from '@/application/use-cases/user/update-user.command'
import { QuerySpecExecutorFacade } from '@/infrastructure/facade/query/query-spec-executor.facade'
import { UserQueryBuilder as Q } from '@/users/application/ports/user-query-spec.port'
import { UserQueryExecutorFacade } from '@/infrastructure/facade/user-query-executor.facade'
import { Logger } from '@/infrastructure/adapters/logger'
import { AllowanceCodes } from '@/application/ports/allowance-codes'
import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'


const logger = Logger.child('onChatMember')

export async function onChatMember(ctx: Context) {
  const isSubscribed = ctx.chatMember?.new_chat_member.status === 'member'

  logger.info('Chat member updated', {
    isSubscribed,
    userId: ctx.chatMember?.new_chat_member.user.id,
    username: ctx.chatMember?.new_chat_member.user.username,
  })

  if (!ctx.chatMember?.new_chat_member.user.id) {
    logger.warn('Missing user id in chat member update')
    return
  }

  logger.info('Chat member update data', {
    id: ctx.chatMember?.new_chat_member.user.id.toString()
  })

  const telegramId = ctx.chatMember.new_chat_member.user.id
  const q = Q.extraEquals('telegramId', telegramId)
  const executor = UserQueryExecutorFacade.getInstance()
  const result = await executor.executeOne(q)

  if (!result) {
    logger.warn('User not found for chat member update', { telegramId })
    return
  }

  const userService = UserServiceFacade.getInstance()
  const subCode = AllowanceCodes.canGenerate3DPlanPlus
  const hasSubAllowance = result.hasAllowance(subCode)

  if (isSubscribed) {
    if (!hasSubAllowance) {
      // Первая подписка — назначаем бонусный allowance
      await userService.assignAllowances(result.id, [{
        code: subCode,
        quantity: 3,
        quantityUsed: 0,
        unlimited: false,
        expiresAt: null,
      }])
      logger.info('Subscription bonus assigned', { userId: result.id })
    } else {
      logger.info('Subscription bonus already claimed, skipping', { userId: result.id })
    }
  } else {
    if (hasSubAllowance) {
      // Отписка — потребляем весь оставшийся лимит (allowance остаётся, но пустой)
      const remaining = result.getAllowance(subCode)!.remainingQuantity
      if (remaining > 0) {
        await userService.consumeAllowances(result.id, [subCode], [remaining])
      }
      logger.info('Subscription bonus consumed', { userId: result.id, consumed: remaining })
    }
  }

  await updateUserCommand(result.id, {
    extra: {
      subscribedToChannel: isSubscribed,
    },
  })

  logger.info('User updated with subscription status', {
    userId: result.id,
    subscribedToChannel: isSubscribed,
  })
}
