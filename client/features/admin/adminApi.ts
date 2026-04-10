import { buildSecureRequestInit } from "@/lib/http/secureFetch"

type ApiErrorPayload = {
  error?: string
  message?: string
}

function withSecureAdminRequestDefaults(init?: RequestInit): RequestInit {
  const requestInit = buildSecureRequestInit(init)
  requestInit.cache = init?.cache ?? "no-store"

  return requestInit
}

export async function adminFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, withSecureAdminRequestDefaults(init))
}

export async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & ApiErrorPayload)
    | null

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expirée. Reconnectez-vous.")
    }

    if (response.status === 403) {
      throw new Error("Action non autorisée.")
    }

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
