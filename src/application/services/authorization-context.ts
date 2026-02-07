import { type AuthorizationContextPort } from '@application/ports/authorization-context.port'
import { AllowanceCodes } from '@application/ports/allowance-codes'
import { type UserDTO } from '@users/presentation/dto/user.dto'
import { type UserServicePort } from '@users/application/ports/user-service.port'

export class AuthorizationContext implements AuthorizationContextPort {
  constructor(
    private readonly userDTO: UserDTO,
    private readonly userService: UserServicePort
  ) {}

  can(allowance: AllowanceCodes): boolean {
    return this.userDTO.allowances.some(userAllowance => {
      if (userAllowance.code !== allowance) {
        return false
      }

      const isExpired = userAllowance.expiresAt !== null &&
        userAllowance.expiresAt < Date.now()

      if (isExpired) {
        return false
      }

      if (userAllowance.unlimited) {
        return true
      }

      return userAllowance.quantityRemaining > 0
    })
  }

  get user() {
    return this.userDTO
  }

  async refresh(): Promise<void> {
    const freshUser = await this.userService.findById(this.userDTO.id)
    if (!freshUser) {
      throw new Error(`User ${this.userDTO.id} not found`)
    }
    Object.assign(this.userDTO, freshUser)
  }
}
