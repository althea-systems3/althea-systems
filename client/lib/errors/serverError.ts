import { NextResponse } from "next/server"

export type LogServerErrorOptions = {
  feature: string
  error: unknown
  context?: Record<string, unknown>
}

export type ServerErrorPayload = {
  error: string
  errorId: string
}

const CORRELATION_PREFIX = "ERR"

function generateErrorId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${CORRELATION_PREFIX}-${timestamp}-${random}`
}

function sanitizeError(error: unknown): {
  type: string
  code?: string
  message?: string
} {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      message: error.message,
    }
  }

  if (typeof error === "object" && error !== null) {
    const err = error as { code?: unknown; message?: unknown; name?: unknown }
    return {
      type: typeof err.name === "string" ? err.name : "UnknownObject",
      code: typeof err.code === "string" ? err.code : undefined,
      message: typeof err.message === "string" ? err.message : undefined,
    }
  }

  return { type: typeof error }
}

function sanitizeSupabaseAuthError(error: unknown): {
  type: string
  code: string
} {
  if (typeof error === "object" && error !== null) {
    const err = error as { code?: unknown; status?: unknown }
    const code =
      typeof err.code === "string"
        ? err.code
        : typeof err.status === "number"
          ? `status_${err.status}`
          : "unknown"

    return { type: "SupabaseAuthError", code }
  }

  return { type: "SupabaseAuthError", code: "unknown" }
}

export function logServerError(options: LogServerErrorOptions): string {
  const errorId = generateErrorId()
  const sanitized = sanitizeError(options.error)
  const context = options.context ?? {}

  console.error("Server error", {
    errorId,
    feature: options.feature,
    error: sanitized,
    context,
  })

  return errorId
}

export function logSupabaseAuthError(options: LogServerErrorOptions): string {
  const errorId = generateErrorId()
  const sanitized = sanitizeSupabaseAuthError(options.error)
  const context = options.context ?? {}

  console.error("Supabase auth error", {
    errorId,
    feature: options.feature,
    error: sanitized,
    context,
  })

  return errorId
}

export function buildServerErrorResponse(
  errorId: string,
  status = 500,
  message = "Erreur serveur",
): NextResponse<ServerErrorPayload> {
  return NextResponse.json({ error: message, errorId }, { status })
}
