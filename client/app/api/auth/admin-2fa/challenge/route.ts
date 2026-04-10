import { NextRequest, NextResponse } from "next/server"
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

type AdminProfileRow = {
  est_admin?: boolean | null
  nom_complet?: string | null
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfError = verifyCsrf(request)

  if (csrfError) {
    return csrfError
  }

  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
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
      .select("est_admin, nom_complet")
      .eq("id_utilisateur", user.id)
      .single()

    const profile = (profileData as AdminProfileRow | null) ?? null

    if (profile?.est_admin !== true) {
      return NextResponse.json(
        {
          error: "Accès réservé aux administrateurs.",
          code: "admin_required",
        },
        { status: 403 },
      )
    }

    if (!user.email) {
      return NextResponse.json(
        {
          error: "Adresse e-mail administrateur introuvable.",
          code: "admin_email_missing",
        },
        { status: 400 },
      )
    }

    const challenge = createAdminTwoFactorChallenge(user.id)
    const isProduction = process.env.NODE_ENV === "production"

    cookieStore.set(ADMIN_2FA_CHALLENGE_COOKIE_NAME, challenge.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_2FA_CHALLENGE_TTL_SECONDS,
    })
    cookieStore.delete(ADMIN_2FA_VERIFIED_COOKIE_NAME)

    try {
      await sendAdminTwoFactorEmail({
        recipientEmail: user.email,
        adminName: resolveAdminName(profile, user.email),
        code: challenge.code,
        expiresInMinutes: Math.round(ADMIN_2FA_CHALLENGE_TTL_SECONDS / 60),
      })
    } catch (error) {
      console.error("Impossible d'envoyer le challenge 2FA admin", { error })

      cookieStore.delete(ADMIN_2FA_CHALLENGE_COOKIE_NAME)

      return NextResponse.json(
        {
          error: "Impossible d'envoyer le code de vérification.",
          code: "challenge_unavailable",
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      message: "challenge_sent",
      challengeExpiresInSeconds: ADMIN_2FA_CHALLENGE_TTL_SECONDS,
      requiresAdminTwoFactor: true,
    })
  } catch (error) {
    console.error("Erreur inattendue challenge 2FA admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
