import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createAdminTwoFactorChallenge } from "@/lib/auth/adminTwoFactor"
import { verifyCsrf } from "@/lib/auth/csrf"
import { sendAdminTwoFactorEmail } from "@/lib/auth/email"
import {
  ADMIN_2FA_CHALLENGE_COOKIE_NAME,
  ADMIN_2FA_CHALLENGE_TTL_SECONDS,
  ADMIN_2FA_VERIFIED_COOKIE_NAME,
} from "@/lib/auth/constants"
import { createServerClient } from "@/lib/supabase/server"
import { logServerError } from "@/lib/errors/serverError"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REMEMBER_SESSION_COOKIE = "althea_remember_session"
const REMEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 30

type SignInRequestBody = {
  email?: string
  password?: string
  rememberSession?: boolean
}

type AdminProfileRow = {
  est_admin?: boolean | null
  nom_complet?: string | null
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function getInvalidReason(body: SignInRequestBody | null): string | null {
  if (!body || typeof body !== "object") {
    return "invalid_payload"
  }

  const email = normalizeString(body.email)
  const password = normalizeString(body.password)

  if (!email) {
    return "email_required"
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "email_invalid"
  }

  if (!password) {
    return "password_required"
  }

  return null
}

function mapSignInErrorCode(errorMessage: string): {
  code: string
  status: number
} {
  const normalizedMessage = errorMessage.toLowerCase()

  if (normalizedMessage.includes("email not confirmed")) {
    return {
      code: "email_not_verified",
      status: 403,
    }
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return {
      code: "invalid_credentials",
      status: 401,
    }
  }

  if (
    normalizedMessage.includes("token") &&
    normalizedMessage.includes("expired")
  ) {
    return {
      code: "session_expired",
      status: 401,
    }
  }

  return {
    code: "signin_failed",
    status: 400,
  }
}

function mapSignInErrorMessage(errorCode: string): string {
  if (errorCode === "email_not_verified") {
    return "Adresse e-mail non vérifiée."
  }

  if (errorCode === "invalid_credentials") {
    return "Identifiants invalides."
  }

  if (errorCode === "session_expired") {
    return "Session expirée."
  }

  return "Connexion impossible pour le moment."
}

function resolveAdminName(
  profile: AdminProfileRow | null,
  email: string | null | undefined,
): string {
  const profileName =
    typeof profile?.nom_complet === "string" ? profile.nom_complet.trim() : ""

  if (profileName) {
    return profileName
  }

  const normalizedEmail = typeof email === "string" ? email.trim() : ""

  return normalizedEmail || "Administrateur"
}

function persistRememberSessionPreference(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  rememberSession: boolean,
): void {
  const isProductionEnvironment = process.env.NODE_ENV === "production"

  cookieStore.set(REMEMBER_SESSION_COOKIE, rememberSession ? "true" : "false", {
    path: "/",
    sameSite: "lax",
    secure: isProductionEnvironment,
    httpOnly: true,
    ...(rememberSession ? { maxAge: REMEMBER_SESSION_MAX_AGE } : {}),
  })

  if (rememberSession) {
    return
  }

  // Force Supabase auth cookies to session scope when "remember me" is disabled.
  cookieStore
    .getAll()
    .filter(({ name }) => name.startsWith("sb-") && name.includes("auth-token"))
    .forEach(({ name, value }) => {
      cookieStore.set(name, value, {
        path: "/",
        sameSite: "lax",
        secure: isProductionEnvironment,
        httpOnly: true,
      })
    })
}

export async function POST(request: Request) {
  const csrfError = verifyCsrf(request)

  if (csrfError) {
    return csrfError
  }

  try {
    const body = (await request
      .json()
      .catch(() => null)) as SignInRequestBody | null

    const invalidReason = getInvalidReason(body)

    if (invalidReason) {
      return NextResponse.json(
        {
          error: "Payload connexion invalide",
          code: invalidReason,
        },
        { status: 400 },
      )
    }

    const email = normalizeString(body?.email).toLowerCase()
    const password = normalizeString(body?.password)
    const rememberSession = body?.rememberSession === true

    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const mappedError = mapSignInErrorCode(error.message)

      return NextResponse.json(
        {
          error: mapSignInErrorMessage(mappedError.code),
          code: mappedError.code,
        },
        { status: mappedError.status },
      )
    }

    if (!data.user) {
      return NextResponse.json(
        {
          error: "Session utilisateur introuvable",
          code: "invalid_credentials",
        },
        { status: 401 },
      )
    }

    persistRememberSessionPreference(cookieStore, rememberSession)

    const { data: profileData } = await supabaseClient
      .from("utilisateur")
      .select("est_admin, nom_complet")
      .eq("id_utilisateur", data.user.id)
      .maybeSingle()

    const profile = (profileData as AdminProfileRow | null) ?? null
    const isAdmin = profile?.est_admin === true

    if (isAdmin) {
      if (!data.user.email) {
        return NextResponse.json(
          {
            error: "Adresse e-mail administrateur introuvable.",
            code: "admin_email_missing",
          },
          { status: 400 },
        )
      }

      const challenge = createAdminTwoFactorChallenge(data.user.id)
      const isProductionEnvironment = process.env.NODE_ENV === "production"

      cookieStore.set(ADMIN_2FA_CHALLENGE_COOKIE_NAME, challenge.token, {
        path: "/",
        sameSite: "strict",
        secure: isProductionEnvironment,
        httpOnly: true,
        maxAge: ADMIN_2FA_CHALLENGE_TTL_SECONDS,
      })
      cookieStore.delete(ADMIN_2FA_VERIFIED_COOKIE_NAME)

      let emailDeliveryFailed = false
      try {
        await sendAdminTwoFactorEmail({
          recipientEmail: data.user.email,
          adminName: resolveAdminName(profile, data.user.email),
          code: challenge.code,
          expiresInMinutes: Math.round(ADMIN_2FA_CHALLENGE_TTL_SECONDS / 60),
        })
      } catch (challengeError) {
        emailDeliveryFailed = true
        logServerError({
          feature: "auth.signin.admin_2fa_challenge",
          error: challengeError,
          context: { userId: data.user.id },
        })

        // NOTE: Fallback dev/preprod : si Resend échoue, on log le code 2FA
        // dans les logs serveur au lieu de bloquer la connexion admin.
        // En production avec Resend correctement configuré, ce chemin n'est jamais pris.
        console.warn("[ADMIN_2FA_FALLBACK] Email delivery failed — code below valid for", Math.round(ADMIN_2FA_CHALLENGE_TTL_SECONDS / 60), "minutes")
        console.warn("[ADMIN_2FA_FALLBACK] userId:", data.user.id, "email:", data.user.email, "code:", challenge.code)
      }

      return NextResponse.json(
        {
          message: "admin_2fa_required",
          isAuthenticated: true,
          rememberSession,
          requiresAdminTwoFactor: true,
          challengeExpiresInSeconds: ADMIN_2FA_CHALLENGE_TTL_SECONDS,
          emailDeliveryFailed,
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        message: "signin_success",
        isAuthenticated: true,
        rememberSession,
        requiresAdminTwoFactor: false,
        user: {
          id: data.user.id,
          email: data.user.email ?? email,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    const errorId = logServerError({
      feature: "auth.signin",
      error,
    })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
        errorId,
      },
      { status: 500 },
    )
  }
}
