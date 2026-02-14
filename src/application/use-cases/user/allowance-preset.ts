import { type AllowanceInput } from '@/users/application/ports/user-service.port'
import { AllowanceCodes } from '@/application/ports/allowance-codes'

export class AllowancePreset {
  static FREE(): [AllowanceInput] {
    return [
      {
        code: AllowanceCodes.canGenerate3DPlan,
        unlimited: false,
        quantity: 1,
        quantityUsed: 0,
        expiresAt: null
      },
    ]
  }

  static ADMIN(): AllowanceInput[] {
    return [
      {
        code: AllowanceCodes.canManageAll,
        unlimited: true,
        quantity: 0,
        quantityUsed: 0,
        expiresAt: null
      },
    ]
  }
}
