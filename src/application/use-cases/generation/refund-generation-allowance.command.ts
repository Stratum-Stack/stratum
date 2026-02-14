import { UserServiceFacade } from '@/infrastructure/facade/user-service.facade'
import { logger } from '@/infrastructure/adapters/logger.adapter'

const log = logger.child('RefundGenerationAllowance')

export type RefundGenerationAllowanceInput = {
  userId: string
  allowanceCode: string
}

export async function refundGenerationAllowanceCommand(
  input: RefundGenerationAllowanceInput
): Promise<void> {
  const { userId, allowanceCode } = input

  log.info('Refunding generation allowance', { userId, allowanceCode })

  try {
    const userService = UserServiceFacade.getInstance()
    await userService.increaseAllowances(userId, [allowanceCode], [1])

    log.info('Allowance refunded successfully', { userId, allowanceCode })
  } catch (error) {
    log.error('Failed to refund allowance', { userId, allowanceCode, error })
    throw error
  }
}
