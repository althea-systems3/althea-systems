import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { isStrongPassword } from "@/features/auth/signUpValidation"

type ResetPasswordRequestBody = {
  password?: string
  passwordConfirmation?: string
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function getInvalidReason(
  body: ResetPasswordRequestBody | null,
): string | null {
  if (!body || typeof body !== "object") {
    return "invalid_payload"
  }

  const password = normalizeString(body.password)
  const passwordConfirmation = normalizeString(body.passwordConfirmation)

  if (!password) {
    return "password_required"
  }

  if (!isStrongPassword(password)) {
    return "password_weak"
  }

  if (!passwordConfirmation) {
    return "password_confirmation_required"
  }

  if (passwordConfirmation !== password) {
    return "passwords_mismatch"
  }

  return null
}

function mapResetPasswordErrorCode(errorMessage: string): {
  code: string
  status: number
} {
  const normalizedMessage = errorMessage.toLowerCase()

  if (
    normalizedMessage.includes("session") ||
    normalizedMessage.includes("token")
  ) {
    return {
      code: "session_expired",
      status: 401,
    }
  }

  if (normalizedMessage.includes("password")) {
    return {
      code: "password_too_weak",
      status: 400,
    }
  }

  return {
    code: "reset_failed",
    status: 400,
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as ResetPasswordRequestBody | null

    const invalidReason = getInvalidReason(body)

    if (invalidReason) {
      return NextResponse.json(
        {
          error: "Payload reset mot de passe invalide",
          code: invalidReason,
        },
        { status: 400 },
      )
    }

    const password = normalizeString(body?.password)
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const {
      data: { user },
      error: getUserError,
    } = await supabaseClient.auth.getUser()

    if (getUserError || !user) {
      return NextResponse.json(
        {
          error: "Session de reinitialisation expiree",
          code: "session_expired",
        },
        { status: 401 },
      )
    }

    const { error } = await supabaseClient.auth.updateUser({
      password,
    })

    if (error) {
      const mappedError = mapResetPasswordErrorCode(error.message)

      return NextResponse.json(
        {
          error: error.message,
          code: mappedError.code,
        },
        { status: mappedError.status },
      )
    }

    await supabaseClient.auth.signOut().catch(() => {
      // Keep the success response even if explicit sign-out fails.
    })

    return NextResponse.json(
      {
        message: "password_reset_success",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Erreur inattendue reset mot de passe", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
