import { type UserServicePort } from '@/users/application/ports/user-service.port'
import { type UserProfilePort  } from '@/application/ports/user-profile.port'
import { UserServiceFactory } from '@users/infrastructure/factory/user-service.factory'
import { EventBusFacade } from '@/infrastructure/facade/event-bus.facade'
import { mongoConnection } from '@/infrastructure/adapters/mongo'

export class UserServiceFacade {
  private static instance: UserServicePort<any>

  static getInstance<T extends Record<string, any> = Record<string, any>>(): UserServicePort<T> {
    if (!UserServiceFacade.instance) {
      UserServiceFacade.instance = UserServiceFactory.create(
        mongoConnection.getDb(),
        EventBusFacade.getInstance()
      )
    }
    return UserServiceFacade.instance
  }
}
