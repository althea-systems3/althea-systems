import { NextResponse } from "next/server"

const CSRF_MISSING_HEADERS_MESSAGE =
  "Requête rejetée : headers origin/host manquants"
const CSRF_INVALID_ORIGIN_MESSAGE = "Requête rejetée : origin non autorisée"

function normalizeOrigin(rawOrigin: string): string | null {
  try {
    const parsedOrigin = new URL(rawOrigin)
    return parsedOrigin.host.toLowerCase()
  } catch {
    return null
  }
}

function getExpectedHost(request: Request): string | null {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.trim()
    .toLowerCase()
  const hostHeader = request.headers.get("host")?.trim().toLowerCase()

  const requestUrl = (() => {
    try {
      return new URL(request.url)
    } catch {
      return null
    }
  })()

  const expectedHost =
    forwardedHost || hostHeader || requestUrl?.host.toLowerCase()

  if (!expectedHost) {
    return null
  }

  return expectedHost
}

/**
 * NOTE: Vérifie que l'origin de la requête correspond au host.
 * Bloque les requêtes cross-origin non-GET (protection CSRF sans token).
 */
export function verifyCsrf(request: Request): NextResponse | null {
  const isReadOnlyMethod = request.method === "GET" || request.method === "HEAD"

  if (isReadOnlyMethod) {
    return null
  }

  const origin = request.headers.get("origin")
  const expectedHost = getExpectedHost(request)

  if (!origin || !expectedHost) {
    return NextResponse.json(
      { error: CSRF_MISSING_HEADERS_MESSAGE },
      { status: 403 },
    )
  }

  const normalizedOrigin = normalizeOrigin(origin)

  if (!normalizedOrigin) {
    return NextResponse.json(
      { error: CSRF_INVALID_ORIGIN_MESSAGE },
      { status: 403 },
    )
  }

  const isOriginMatchingHost = normalizedOrigin === expectedHost

  if (!isOriginMatchingHost) {
    return NextResponse.json(
      { error: CSRF_INVALID_ORIGIN_MESSAGE },
      { status: 403 },
    )
  }

  return null
}
