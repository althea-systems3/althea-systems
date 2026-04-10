const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

function readCookieValue(cookieName: string): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const encodedName = `${encodeURIComponent(cookieName)}=`
  const allCookies = document.cookie.split(";")

  for (const rawCookie of allCookies) {
    const cookie = rawCookie.trim()

    if (!cookie.startsWith(encodedName)) {
      continue
    }

    const encodedValue = cookie.slice(encodedName.length)

    try {
      return decodeURIComponent(encodedValue)
    } catch {
      return encodedValue
    }
  }

  return null
}

function resolveCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const metaToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content")
    ?.trim()

  if (metaToken) {
    return metaToken
  }

  return readCookieValue("csrf_token") ?? readCookieValue("XSRF-TOKEN")
}

export function buildSecureRequestInit(init?: RequestInit): RequestInit {
  const method = (init?.method ?? "GET").toUpperCase()
  const headers = new Headers(init?.headers)
  const isMutatingMethod = !SAFE_HTTP_METHODS.has(method)
  const hasFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData

  headers.set("X-Requested-With", "XMLHttpRequest")

  if (isMutatingMethod && !hasFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const csrfToken = resolveCsrfToken()

  if (csrfToken && isMutatingMethod && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", csrfToken)
  }

  const requestInit: RequestInit = {
    ...init,
    method,
    headers,
    credentials: init?.credentials ?? "same-origin",
  }

  if (!init?.cache && isMutatingMethod) {
    requestInit.cache = "no-store"
  }

  return requestInit
}

export async function secureFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, buildSecureRequestInit(init))
}
