import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import {
  SIGNUP_API_ENV_KEYS,
  createConfigurationMissingApiPayload,
  isMissingRuntimeConfigError,
  logMissingRuntimeConfig,
  validateRuntimeConfig,
} from "@/lib/config/runtime"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8

type SignUpRequestBody = {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  phone?: string
  acceptTerms?: boolean
  redirectTo?: string
  source?: string
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function hasStrongPassword(password: string): boolean {
  const hasLowercaseCharacter = /[a-z]/.test(password)
  const hasUppercaseCharacter = /[A-Z]/.test(password)
  const hasNumericCharacter = /\d/.test(password)

  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    hasLowercaseCharacter &&
    hasUppercaseCharacter &&
    hasNumericCharacter
  )
}

function getInvalidReason(body: SignUpRequestBody | null): string | null {
  if (!body || typeof body !== "object") {
    return "invalid_payload"
  }

  const firstName = normalizeString(body.firstName)
  const lastName = normalizeString(body.lastName)
  const email = normalizeString(body.email)
  const password = normalizeString(body.password)

  if (!firstName) {
    return "first_name_required"
  }

  if (!lastName) {
    return "last_name_required"
  }

  if (!email) {
    return "email_required"
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "email_invalid"
  }

  if (!password) {
    return "password_required"
  }

  if (!hasStrongPassword(password)) {
    return "password_weak"
  }

  if (body.acceptTerms !== true) {
    return "terms_required"
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

function mapSupabaseSignUpError(errorMessage: string): {
  code: string
  status: number
} {
  const normalizedMessage = errorMessage.toLowerCase()

  if (normalizedMessage.includes("already registered")) {
    return {
      code: "email_already_used",
      status: 409,
    }
  }

  if (normalizedMessage.includes("password")) {
    return {
      code: "password_too_weak",
      status: 400,
    }
  }

  return {
    code: "signup_failed",
    status: 400,
  }
}

export async function POST(request: Request) {
  const configValidation = validateRuntimeConfig(SIGNUP_API_ENV_KEYS)

  if (!configValidation.isValid) {
    logMissingRuntimeConfig(
      "api.auth.signup.post",
      configValidation.missingKeys,
    )

    return NextResponse.json(
      createConfigurationMissingApiPayload("Inscription"),
      { status: 503 },
    )
  }

  try {
    const body = (await request
      .json()
      .catch(() => null)) as SignUpRequestBody | null

    const invalidReason = getInvalidReason(body)

    if (invalidReason) {
      return NextResponse.json(
        {
          error: "Payload inscription invalide",
          code: invalidReason,
        },
        { status: 400 },
      )
    }

    const firstName = normalizeString(body?.firstName)
    const lastName = normalizeString(body?.lastName)
    const email = normalizeString(body?.email).toLowerCase()
    const password = normalizeString(body?.password)
    const phone = normalizeString(body?.phone)
    const source = normalizeString(body?.source) || "sign_up_page"

    const requestUrl = new URL(request.url)
    const safeRedirectTo = getSafeRedirectTo(
      normalizeString(body?.redirectTo),
      requestUrl.origin,
    )

    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          safeRedirectTo ?? `${requestUrl.origin}/auth/confirm?locale=fr`,
        data: {
          nom_complet: `${firstName} ${lastName}`.trim(),
          prenom: firstName,
          nom: lastName,
          telephone: phone || null,
          signup_source: source,
        },
      },
    })

    if (error) {
      const mappedError = mapSupabaseSignUpError(error.message)

      return NextResponse.json(
        {
          error: error.message,
          code: mappedError.code,
        },
        { status: mappedError.status },
      )
    }

    return NextResponse.json(
      {
        message: "signup_created",
        requiresEmailVerification: !data.session,
        isAuthenticated: Boolean(data.session),
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email ?? email,
            }
          : null,
      },
      { status: 201 },
    )
  } catch (error) {
    if (isMissingRuntimeConfigError(error)) {
      logMissingRuntimeConfig("api.auth.signup.post", error.missingKeys)

      return NextResponse.json(
        createConfigurationMissingApiPayload("Inscription"),
        { status: 503 },
      )
    }

    console.error("Erreur inattendue inscription", { error })
    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
