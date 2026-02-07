import { mongoConnection } from '@/infrastructure/adapters/mongo'
import { getSettingsModel } from '@/infrastructure/models/settings.model'
import type { Setting } from '@/application/use-cases/settings/update-settings.command'

export async function findSettings(): Promise<Setting[]>
export async function findSettings(key: string): Promise<Setting | null>
export async function findSettings(keys: string[]): Promise<Setting[]>
export async function findSettings(keys?: string[] | string): Promise<Setting[] | Setting | null> {
  const client = mongoConnection.getDb()
  const model = getSettingsModel(client)

  const settings = await model.find({}).lean()

  if (typeof keys === 'string') {
    return settings.find((s: Setting) => s.key === keys) ?? null
  } else if (Array.isArray(keys)) {
    return settings.filter((s: Setting) => keys.includes(s.key))
  }

  return settings
}

