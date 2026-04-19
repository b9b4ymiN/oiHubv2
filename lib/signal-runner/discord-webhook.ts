export async function postDiscordWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text()
    const detail = body ? `: ${body}` : ''
    throw new Error(`Discord webhook HTTP ${response.status}${detail}`)
  }
}
