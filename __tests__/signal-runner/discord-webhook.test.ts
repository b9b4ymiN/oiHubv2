import { describe, expect, it, vi, afterEach } from 'vitest'
import { postDiscordWebhook } from '@/lib/signal-runner/discord-webhook'

describe('postDiscordWebhook', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts JSON payload successfully when Discord returns ok', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    )

    await expect(
      postDiscordWebhook('https://discord.com/api/webhooks/test', { content: 'hello' })
    ).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('throws with HTTP status details when Discord returns non-ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('unknown webhook', { status: 404 })
    )

    await expect(
      postDiscordWebhook('https://discord.com/api/webhooks/test', { content: 'hello' })
    ).rejects.toThrow('Discord webhook HTTP 404: unknown webhook')
  })
})
