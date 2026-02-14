export type UserQuery =
  // Простые операции с полями
  | { field: 'email', op: 'equals', value: string }
  | { field: 'email', op: 'contains', value: string }
  | { field: 'allowanceCode', op: 'equals', value: string }
  | { field: 'createdAt', op: 'gt', value: Date }
  | { field: 'createdAt', op: 'lt', value: Date }
  | { field: 'deletedAt', op: 'isNull' }
  | { field: 'deletedAt', op: 'isNotNull' }
  | { field: 'licenseAcceptedAt', op: 'isNull' }
  | { field: 'licenseAcceptedAt', op: 'isNotNull' }
  // Поиск по extra свойствам
  | { field: 'extra', key: string, op: 'equals', value: unknown }
  | { field: 'extra', key: string, op: 'contains', value: string }
  | { field: 'extra', key: string, op: 'exists' }
  | { field: 'extra', key: string, op: 'notExists' }
  // Композиция запросов
  | { and: UserQuery[] }
  | { or: UserQuery[] }
  | { not: UserQuery }

export const UserQueryBuilder = {
  email(value: string): UserQuery {
    return { field: 'email', op: 'equals', value }
  },

  emailContains(value: string): UserQuery {
    return { field: 'email', op: 'contains', value }
  },

  hasAllowance(code: string): UserQuery {
    return { field: 'allowanceCode', op: 'equals', value: code }
  },

  createdAfter(date: Date): UserQuery {
    return { field: 'createdAt', op: 'gt', value: date }
  },

  createdBefore(date: Date): UserQuery {
    return { field: 'createdAt', op: 'lt', value: date }
  },

  isDeleted(): UserQuery {
    return { field: 'deletedAt', op: 'isNotNull' }
  },

  isNotDeleted(): UserQuery {
    return { field: 'deletedAt', op: 'isNull' }
  },

  hasAcceptedLicense(): UserQuery {
    return { field: 'licenseAcceptedAt', op: 'isNotNull' }
  },

  hasNotAcceptedLicense(): UserQuery {
    return { field: 'licenseAcceptedAt', op: 'isNull' }
  },

  and(...queries: UserQuery[]): UserQuery {
    return { and: queries }
  },

  or(...queries: UserQuery[]): UserQuery {
    return { or: queries }
  },

  not(query: UserQuery): UserQuery {
    return { not: query }
  },

  extraEquals(key: string, value: unknown): UserQuery {
    return { field: 'extra', key, op: 'equals', value }
  },

  extraContains(key: string, value: string): UserQuery {
    return { field: 'extra', key, op: 'contains', value }
  },

  extraExists(key: string): UserQuery {
    return { field: 'extra', key, op: 'exists' }
  },

  extraNotExists(key: string): UserQuery {
    return { field: 'extra', key, op: 'notExists' }
  }
}
