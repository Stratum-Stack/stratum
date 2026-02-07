import { User } from '@domain/entities/user.entity'
import { Email } from '@domain/value-objects/email.value-object'

export interface UserRepoPort {
  save<T extends Record<string, any> = Record<string, any>>(user: User<T>): Promise<User<T>>
  delete<T extends Record<string, any> = Record<string, any>>(id: string): Promise<User<T>>
  update<T extends Record<string, any> = Record<string, any>>(id: string, userData: Partial<User<T>>): Promise<User<T>>
  findById<T extends Record<string, any> = Record<string, any>>(id: string): Promise<User<T> | null>
  findByEmail<T extends Record<string, any> = Record<string, any>>(email: Email): Promise<User<T> | null>
  findAll<T extends Record<string, any> = Record<string, any>>(page: number, perPage: number): Promise<{ users: User<T>[], total: number }>
}
