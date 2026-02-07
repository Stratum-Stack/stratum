import { z } from 'zod'

export const SettingSchema = z.object({
  key: z.string(),
  value: z.string(),
})

export const SettingsListQuerySchema = z.object({
  keys: z.string().optional().describe('Comma-separated list of keys to filter'),
})

export const SettingsListResponseSchema = z.object({
  data: z.array(SettingSchema),
})

export const UpdateSettingsBodySchema = z.object({
  settings: z.array(SettingSchema),
})

export const UpdateSettingsResponseSchema = z.object({
  data: z.array(SettingSchema),
})
