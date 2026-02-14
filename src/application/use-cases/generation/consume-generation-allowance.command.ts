import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { UserQueryExecutorFacade } from '@/infrastructure/facade/user-query-executor.facade'
import { UserQueryBuilder as Q } from '@/users/application/ports/user-query-spec.port'
import { AllowanceCodes } from '@/application/ports/allowance-codes'
import { InsufficientAllowanceError, GenerationUserNotFoundError } from './errors'

export type ConsumeGenerationAllowanceInput = {
  telegramId: number
}

export type ConsumeGenerationAllowanceOutput = {
  userId: string
  consumedAllowanceCode: string
  remainingQuantity: number
}

const GENERATION_ALLOWANCE_PRIORITY = [
  AllowanceCodes.canGenerate3DPlan,      // базовый (бесплатный)
  AllowanceCodes.canGenerate3DPlanPlus,  // бонус за подписку
  AllowanceCodes.canGenerate3DPlanPro,   // премиум
]

export async function consumeGenerationAllowanceCommand(
  input: ConsumeGenerationAllowanceInput
): Promise<ConsumeGenerationAllowanceOutput> {
  const { telegramId } = input

  // 1. Найти пользователя по telegramId
  const executor = UserQueryExecutorFacade.getInstance()
  const query = Q.extraEquals('telegramId', telegramId)
  const user = await executor.executeOne(query)

  if (!user) {
    throw new GenerationUserNotFoundError(telegramId)
  }

  // 2. Найти первый доступный allowance по приоритету
  let selectedCode: string | null = null

  for (const code of GENERATION_ALLOWANCE_PRIORITY) {
    const allowance = user.getAllowance(code)

    if (allowance && !allowance.isExpired && allowance.remainingQuantity > 0) {
      selectedCode = code
      break
    }
  }

  if (!selectedCode) {
    throw new InsufficientAllowanceError(telegramId)
  }

  // 3. Списать 1 allowance
  const userService = UserServiceFacade.getInstance()
  await userService.consumeAllowances(user.id, [selectedCode], [1])

  // 4. Вернуть информацию для tracking
  const updatedUser = await executor.executeOne(query)
  const remaining = updatedUser?.getAllowance(selectedCode)?.remainingQuantity ?? 0

  return {
    userId: user.id,
    consumedAllowanceCode: selectedCode,
    remainingQuantity: remaining,
  }
}
