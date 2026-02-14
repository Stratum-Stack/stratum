import { type UserQuery } from '@application/ports/user-query-spec.port'

export class MongoUserQueryConverter {
  convert(query: UserQuery): Record<string, any> {
    if ('and' in query) {
      return {
        $and: query.and.map(q => this.convert(q))
      }
    }

    if ('or' in query) {
      return {
        $or: query.or.map(q => this.convert(q))
      }
    }

    if ('not' in query) {
      return {
        $nor: [this.convert(query.not)]
      }
    }

    if (query.field === 'extra') {
      const mongoField = `extra.${query.key}`
      if (query.op === 'equals') {
        return { [mongoField]: query.value }
      }
      if (query.op === 'contains') {
        return { [mongoField]: { $regex: query.value, $options: 'i' } }
      }
      if (query.op === 'exists') {
        return { [mongoField]: { $exists: true } }
      }
      if (query.op === 'notExists') {
        return { [mongoField]: { $exists: false } }
      }
    }

    if (query.op === 'equals') {
      if (query.field === 'allowanceCode') {
        return {
          'allowances.code': query.value
        }
      }
      return { [query.field]: query.value }
    }

    if (query.op === 'contains') {
      return {
        [query.field]: {
          $regex: query.value,
          $options: 'i'
        }
      }
    }

    if (query.op === 'gt') {
      return {
        [query.field]: { $gt: query.value }
      }
    }

    if (query.op === 'lt') {
      return {
        [query.field]: { $lt: query.value }
      }
    }

    if (query.op === 'isNull') {
      return { [query.field]: null }
    }

    if (query.op === 'isNotNull') {
      return {
        [query.field]: { $ne: null }
      }
    }

    throw new Error(`Unknown query operation: ${JSON.stringify(query)}`)
  }
}
