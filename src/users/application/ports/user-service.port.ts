import { type UserDTO } from "@presentation/dto/user.dto"
import { type UserRepoPort } from "@application/ports/user-repository.port"
import { type EventBusPort } from "@application/ports/event-bus.port"

export type AllowanceInput = {
  code: string
  expiresAt?: Date | null
  quantity: number
  quantityUsed: number
  unlimited: boolean
}

export type UserCreateInput<T extends Record<string, any> = Record<string, any>> = {
  email: string
  password: string
  allowances?: AllowanceInput[]
  extra?: T
}

export type UserUpdateInput<T extends Record<string, any> = Record<string, any>> = Partial<UserCreateInput<T>>

export abstract class UserServicePort<T extends Record<string, any> = Record<string, any>> {
  public readonly eventBus: EventBusPort
  public readonly userRepo: UserRepoPort

  constructor(
    eventBus: EventBusPort,
    userRepo: UserRepoPort,
  ) {
    this.eventBus = eventBus
    this.userRepo = userRepo
  }

  abstract create(input: UserCreateInput<T>): Promise<UserDTO<T>>

  abstract updateUser(id: string, input: UserUpdateInput<T>): Promise<UserDTO<T>>
  abstract deleteUser(id: string): Promise<UserDTO<T>>
  abstract findById(id: string): Promise<UserDTO<T> | null>
  abstract findByEmail(email: string): Promise<UserDTO<T> | null>
  abstract findAll(page: number, perPage: number): Promise<{
    users: UserDTO<T>[],
    total: number
  }>

  abstract revokeLicense(id: string): Promise<UserDTO<T>>
  abstract restoreLicense(id: string): Promise<UserDTO<T>>

  abstract assignAllowances(id: string, allowances: AllowanceInput[]): Promise<UserDTO<T>>
  abstract revokeAllowances(id: string, allowanceCodes: string[]): Promise<UserDTO<T>>
  abstract consumeAllowances(id: string, allowanceCodes: string[], quantities: number[]): Promise<UserDTO<T>>
}
