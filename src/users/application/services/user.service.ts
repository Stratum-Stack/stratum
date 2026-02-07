import { User, type UserCreateFields, type UserUpdateFields } from '@domain/entities/user.entity'
import { UserServicePort, type UserCreateInput, type UserUpdateInput, type AllowanceInput } from '@application/ports/user-service.port'
import { Email } from '@domain/value-objects/email.value-object'
import { Allowance } from '@domain/value-objects/allowance.value-object'
import { type EventBusPort } from '@application/ports/event-bus.port'
import { type UserRepoPort } from '@application/ports/user-repository.port'
import { UserDTO } from '@presentation/dto/user.dto'
import {
  UserCreatedIntegrationEvent,
  UserDeletedIntegrationEvent,
  UserLicenseChangedIntegrationEvent,
  UserAllowancesChangedIntegrationEvent
} from '@application/integration-events'

export class UserService<T extends Record<string, any> = Record<string, any>> extends UserServicePort<T> {
  constructor(
    eventBus: EventBusPort,
    userRepo: UserRepoPort,
  ) {
    super(eventBus, userRepo)
  }

  private mapToDTO(user: User<T>): UserDTO<T> {
    return UserDTO.fromEntity(user)
  }

  /**
   * Конвертирует AllowanceInput (примитив) → Allowance VO
   */
  private mapToAllowanceVO(input: AllowanceInput): Allowance {
    return new Allowance(
      input.code,
      input.expiresAt ?? null,
      input.quantity,
      input.quantityUsed,
      input.unlimited
    )
  }

  /**
   * Конвертирует UserCreateInput (примитивы) → UserCreateFields (VO)
   */
  private mapToUserCreateFields(input: UserCreateInput<T>): UserCreateFields<T> {
    return {
      email: new Email(input.email),  // Примитив → VO
      password: input.password,
      allowances: input.allowances?.map(a => this.mapToAllowanceVO(a)),
      extra: input.extra
    }
  }

  /**
   * Конвертирует UserUpdateInput (примитивы) → UserUpdateFields (VO)
   */
  private mapToUserUpdateFields(input: UserUpdateInput<T>): UserUpdateFields<T> {
    const fields: UserUpdateFields<T> = {}

    if (input.email !== undefined) {
      fields.email = new Email(input.email)
    }
    if (input.password !== undefined) {
      fields.password = input.password
    }
    if (input.allowances !== undefined) {
      fields.allowances = input.allowances.map(a => this.mapToAllowanceVO(a))
    }
    if (input.extra !== undefined) {
      fields.extra = input.extra
    }

    return fields
  }

  async create(input: UserCreateInput<T>): Promise<UserDTO<T>> {
    const fields = this.mapToUserCreateFields(input)
    const user = User.create<T>(fields)
    await this.userRepo.save(user)

    // Create and publish Integration Event
    const userDto = this.mapToDTO(user)
    const event = new UserCreatedIntegrationEvent(userDto)
    await this.eventBus.publish(event)

    return userDto
  }

  async updateUser(id: string, input: UserUpdateInput<T>): Promise<UserDTO<T>> {
    // Конвертируем input (примитивы) → domain fields (VO)
    const fields = this.mapToUserUpdateFields(input)
    const user = await this.userRepo.update<T>(id, fields)
    return this.mapToDTO(user)
  }

  async deleteUser(id: string): Promise<UserDTO<T>> {
    const user = await this.userRepo.delete<T>(id)

    // Create and publish Integration Event
    const userDto = this.mapToDTO(user)
    const event = new UserDeletedIntegrationEvent(userDto)
    await this.eventBus.publish(event)

    return userDto
  }

  async findAll(page: number, perPage: number): Promise<{ users: UserDTO<T>[], total: number }> {
    const result = await this.userRepo.findAll<T>(page, perPage)
    return {
      users: result.users.map(user => this.mapToDTO(user)),
      total: result.total
    }
  }

  async findById(id: string): Promise<UserDTO<T> | null> {
    const user = await this.userRepo.findById<T>(id)
    return user ? this.mapToDTO(user) : null
  }

  async findByEmail(email: string): Promise<UserDTO<T> | null> {
    const user = await this.userRepo.findByEmail<T>(new Email(email))
    return user ? this.mapToDTO(user) : null
  }

  async restoreLicense(id: string): Promise<UserDTO<T>> {
    const user = await this.userRepo.findById<T>(id)
    if (!user) {
      throw new Error('User not found')
    }
    user.acceptLicense()
    await this.userRepo.save(user)

    // Create and publish Integration Event
    const userDto = this.mapToDTO(user)
    const event = new UserLicenseChangedIntegrationEvent(userDto)
    await this.eventBus.publish(event)

    return userDto
  }

  async revokeLicense(id: string): Promise<UserDTO<T>> {
    const user = await this.userRepo.findById<T>(id)
    if (!user) {
      throw new Error('User not found')
    }
    user.revokeLicenseAcceptance()
    await this.userRepo.save(user)

    // Create and publish Integration Event
    const userDto = this.mapToDTO(user)
    const event = new UserLicenseChangedIntegrationEvent(userDto)
    await this.eventBus.publish(event)

    return userDto
  }

  async revokeAllowances(id: string, allowanceCodes: string[]): Promise<UserDTO<T>> {
    const user = await this.userRepo.findById<T>(id)
    if (!user) {
      throw new Error('User not found')
    }

    // allowanceCodes уже примитивы (string[]), используем напрямую
    for (const code of allowanceCodes) {
      user.removeAllowance(code)
    }

    await this.userRepo.save(user)

    // Create and publish Integration Event
    const userDto = this.mapToDTO(user)
    const event = new UserAllowancesChangedIntegrationEvent(userDto)
    await this.eventBus.publish(event)

    return userDto
  }

  async assignAllowances(id: string, allowances: AllowanceInput[]): Promise<UserDTO<T>> {
    const user = await this.userRepo.findById<T>(id)
    if (!user) {
      throw new Error('User not found')
    }

    // Конвертируем примитивы → VO
    for (const allowanceInput of allowances) {
      const allowance = this.mapToAllowanceVO(allowanceInput)
      user.addAllowance(allowance)
    }

    await this.userRepo.save(user)

    // Create and publish Integration Event
    const userDto = this.mapToDTO(user)
    const event = new UserAllowancesChangedIntegrationEvent(userDto)
    await this.eventBus.publish(event)

    return userDto
  }

  async consumeAllowances(id: string, allowanceCodes: string[], quantities: number[]): Promise<UserDTO<T>> {
    const user = await this.userRepo.findById<T>(id)
    if (!user) {
      throw new Error('User not found')
    }

    // allowanceCodes уже примитивы (string[]), используем напрямую
    for (let i = 0; i < allowanceCodes.length; i++) {
      const code = allowanceCodes[i]
      const quantity = quantities[i] || 1
      if (!code) {
        throw new Error('Allowance code is required')
      }

      user.consumeAllowance(code, quantity)
    }

    await this.userRepo.save<T>(user)

    // Create and publish Integration Event
    const userDto = this.mapToDTO(user)
    const event = new UserAllowancesChangedIntegrationEvent(userDto)
    await this.eventBus.publish(event)

    return userDto
  }
}
