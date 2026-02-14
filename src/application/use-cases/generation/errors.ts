export class InsufficientAllowanceError extends Error {
  constructor(public readonly telegramId: number) {
    super(`User ${telegramId} has no available generation allowances`)
    this.name = 'InsufficientAllowanceError'
  }
}

export class GenerationUserNotFoundError extends Error {
  constructor(public readonly telegramId: number) {
    super(`User with telegramId ${telegramId} not found`)
    this.name = 'GenerationUserNotFoundError'
  }
}
