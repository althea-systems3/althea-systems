type ApiErrorPayload = {
  error?: string
  message?: string
}

export async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & ApiErrorPayload)
    | null

  if (!response.ok) {
    if (payload?.error) {
      throw new Error(payload.error)
    }

    if (payload?.message) {
      throw new Error(payload.message)
    }

    throw new Error(fallbackMessage)
  }

  if (!payload) {
    throw new Error(fallbackMessage)
  }

  return payload
}
