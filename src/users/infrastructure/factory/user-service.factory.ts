import { type Mongoose } from 'mongoose'
import { UserService } from '@application/services/user.service'
import { UserRepoMongoAdapter } from '@infrastructure/adapters/repositories/user-repo-mongo.adapter'
import { type EventBusPort } from '@application/ports/event-bus.port'

export class UserServiceFactory {
  static create<T extends Record<string, any> = Record<string, any>>(
    mongoClient: Mongoose,
    eventBus: EventBusPort
  ) {
    const userRepo = new UserRepoMongoAdapter(mongoClient)
    return new UserService<T>(eventBus, userRepo)
  }
}
