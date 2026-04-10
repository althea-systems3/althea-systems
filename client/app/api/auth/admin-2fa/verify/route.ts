import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

import {
  createAdminTwoFactorVerifiedToken,
  isValidAdminTwoFactorCode,
  normalizeAdminTwoFactorCode,
  verifyAdminTwoFactorChallenge,
} from "@/lib/auth/adminTwoFactor"
import { verifyCsrf } from "@/lib/auth/csrf"
import {
  ADMIN_2FA_CHALLENGE_COOKIE_NAME,
  ADMIN_2FA_CHALLENGE_TTL_SECONDS,
  ADMIN_2FA_VERIFIED_COOKIE_NAME,
  ADMIN_2FA_VERIFIED_TTL_SECONDS,
} from "@/lib/auth/constants"
import { createServerClient } from "@/lib/supabase/server"

type AdminProfileRow = {
  est_admin?: boolean | null
}

type VerifyAdminTwoFactorRequest = {
  code?: string
}

function clearTwoFactorCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): void {
  cookieStore.delete(ADMIN_2FA_CHALLENGE_COOKIE_NAME)
  cookieStore.delete(ADMIN_2FA_VERIFIED_COOKIE_NAME)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfError = verifyCsrf(request)

  if (csrfError) {
    return csrfError
  }

  try {
    const body = (await request
      .json()
      .catch(() => null)) as VerifyAdminTwoFactorRequest | null
    const code = normalizeAdminTwoFactorCode(body?.code)

    if (!isValidAdminTwoFactorCode(code)) {
      return NextResponse.json(
        {
          error: "Code de vérification invalide.",
          code: "invalid_code",
        },
        { status: 400 },
      )
    }

    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      clearTwoFactorCookies(cookieStore)

      return NextResponse.json(
        {
          error: "Session expirée.",
          code: "session_expired",
        },
        { status: 401 },
      )
    }

    const { data: profileData } = await supabaseClient
      .from("utilisateur")
      .select("est_admin")
      .eq("id_utilisateur", user.id)
      .single()

    const profile = (profileData as AdminProfileRow | null) ?? null

    if (profile?.est_admin !== true) {
      clearTwoFactorCookies(cookieStore)

      return NextResponse.json(
        {
          error: "Accès réservé aux administrateurs.",
          code: "admin_required",
        },
        { status: 403 },
      )
    }

    const challengeToken =
      cookieStore.get(ADMIN_2FA_CHALLENGE_COOKIE_NAME)?.value ?? null

    if (!challengeToken) {
      return NextResponse.json(
        {
          error: "Code de vérification expiré. Demandez un nouveau code.",
          code: "challenge_missing",
        },
        { status: 400 },
      )
    }

    const challengeResult = verifyAdminTwoFactorChallenge({
      token: challengeToken,
      userId: user.id,
      code,
    })

    if (challengeResult.status === "verified") {
      const isProduction = process.env.NODE_ENV === "production"
      const verifiedToken = createAdminTwoFactorVerifiedToken(user.id)

      cookieStore.set(ADMIN_2FA_VERIFIED_COOKIE_NAME, verifiedToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: ADMIN_2FA_VERIFIED_TTL_SECONDS,
      })
      cookieStore.delete(ADMIN_2FA_CHALLENGE_COOKIE_NAME)

      return NextResponse.json({
        message: "admin_2fa_verified",
        verified: true,
      })
    }

    if (challengeResult.status === "invalid_code") {
      if (challengeResult.nextToken) {
        const isProduction = process.env.NODE_ENV === "production"

        cookieStore.set(
          ADMIN_2FA_CHALLENGE_COOKIE_NAME,
          challengeResult.nextToken,
          {
            httpOnly: true,
            secure: isProduction,
            sameSite: "strict",
            path: "/",
            maxAge: ADMIN_2FA_CHALLENGE_TTL_SECONDS,
          },
        )
      } else {
        cookieStore.delete(ADMIN_2FA_CHALLENGE_COOKIE_NAME)
      }

      return NextResponse.json(
        {
          error: "Code invalide ou expiré.",
          code: "invalid_code",
        },
        { status: 400 },
      )
    }

    if (challengeResult.status === "locked") {
      clearTwoFactorCookies(cookieStore)

      return NextResponse.json(
        {
          error:
            "Trop de tentatives. Reconnectez-vous pour générer un nouveau code.",
          code: "too_many_attempts",
        },
        { status: 429 },
      )
    }

    clearTwoFactorCookies(cookieStore)

    if (challengeResult.status === "expired") {
      return NextResponse.json(
        {
          error: "Code de vérification expiré. Demandez un nouveau code.",
          code: "challenge_expired",
        },
        { status: 410 },
      )
    }

    return NextResponse.json(
      {
        error: "Challenge invalide.",
        code: "challenge_invalid",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("Erreur inattendue vérification 2FA admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
