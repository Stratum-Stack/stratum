import { Context } from 'telegraf'

export async function checkTgSub(ctx: Context, channelUsername: string): Promise<string | false> {
  if (!ctx.from?.id) return false
  try {
    const member = await ctx.telegram.getChatMember(channelUsername, ctx.from.id)
    return member.status
  } catch {
    return false
  }
}
