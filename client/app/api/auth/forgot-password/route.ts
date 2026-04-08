import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ForgotPasswordRequestBody = {
  email?: string
  redirectTo?: string
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function getInvalidReason(
  body: ForgotPasswordRequestBody | null,
): string | null {
  if (!body || typeof body !== "object") {
    return "invalid_payload"
  }

  const email = normalizeString(body.email)

  if (!email) {
    return "email_required"
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "email_invalid"
  }

  return null
}

function getSafeRedirectTo(
  rawRedirectTo: string,
  requestOrigin: string,
): string | null {
  if (!rawRedirectTo) {
    return null
  }

  try {
    const redirectUrl = new URL(rawRedirectTo)

    if (redirectUrl.origin !== requestOrigin) {
      return null
    }

    return redirectUrl.toString()
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as ForgotPasswordRequestBody | null

    const invalidReason = getInvalidReason(body)

    if (invalidReason) {
      return NextResponse.json(
        {
          error: "Payload mot de passe oublie invalide",
          code: invalidReason,
        },
        { status: 400 },
      )
    }

    const email = normalizeString(body?.email).toLowerCase()
    const requestUrl = new URL(request.url)
    const safeRedirectTo = getSafeRedirectTo(
      normalizeString(body?.redirectTo),
      requestUrl.origin,
    )

    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: safeRedirectTo ?? `${requestUrl.origin}/auth/reset?locale=fr`,
    })

    if (error) {
      if (error.message.toLowerCase().includes("rate")) {
        return NextResponse.json(
          {
            error: error.message,
            code: "rate_limited",
          },
          { status: 429 },
        )
      }

      console.warn("Erreur resetPasswordForEmail", { error })
    }

    // Neutral success response to avoid leaking account existence.
    return NextResponse.json(
      {
        message: "password_reset_email_sent",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Erreur inattendue mot de passe oublie", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
