import { UserDTO } from '@users/presentation/dto/user.dto'
import { AllowanceCodes } from './allowance-codes'
import { type UserProfilePort } from './user-profile.port'

export abstract class AuthorizationContextPort {
 abstract can(allowanceCode: AllowanceCodes): boolean
 abstract get user(): UserDTO<UserProfilePort>
}
