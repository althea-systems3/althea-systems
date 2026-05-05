import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createServerClient } from "@/lib/supabase/server"
import { defaultLocale, locales, type AppLocale } from "@/lib/i18n"

function normalizeString(value: string | null): string {
  if (!value) {
    return ""
  }
  return value.trim()
}

function getSafeLocale(localeValue: string | null): AppLocale {
  if (localeValue && locales.includes(localeValue as AppLocale)) {
    return localeValue as AppLocale
  }
  return defaultLocale
}

function getSafeNextPath(nextPath: string | null): string | null {
  const normalizedPath = normalizeString(nextPath)

  if (!normalizedPath || !normalizedPath.startsWith("/")) {
    return null
  }

  if (normalizedPath.startsWith("//")) {
    return null
  }

  return normalizedPath
}

function withLocalePrefix(path: string, locale: AppLocale): string {
  const normalizedPath = path || "/"
  const firstSegment = normalizedPath.split("/")[1]

  if (firstSegment && locales.includes(firstSegment as AppLocale)) {
    return normalizedPath
  }

  if (normalizedPath === "/") {
    return `/${locale}`
  }

  return `/${locale}${normalizedPath}`
}

/**
 * Handles the Supabase Auth PKCE callback.
 *
 * Supabase envoie l'email de confirmation/reset avec un lien de la forme :
 *   https://altheasystem.com/auth/callback?code=xxx&next=/mon-compte
 *
 * Le code est échangé contre une session Supabase via exchangeCodeForSession,
 * puis l'user est redirigé vers la page voulue (next) ou l'accueil par défaut.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = normalizeString(requestUrl.searchParams.get("code"))
  const locale = getSafeLocale(requestUrl.searchParams.get("locale"))
  const nextPath =
    getSafeNextPath(requestUrl.searchParams.get("next")) ?? "/mon-compte"

  if (!code) {
    const fallbackPath = withLocalePrefix("/connexion?reason=invalid_link", locale)
    return NextResponse.redirect(new URL(fallbackPath, requestUrl.origin))
  }

  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const { error } = await supabaseClient.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Erreur exchangeCodeForSession", {
        error: error.message,
      })

      const errorPath = withLocalePrefix(
        "/connexion?reason=invalid_link",
        locale,
      )
      return NextResponse.redirect(new URL(errorPath, requestUrl.origin))
    }

    const successPath = withLocalePrefix(nextPath, locale)
    return NextResponse.redirect(new URL(successPath, requestUrl.origin))
  } catch (error) {
    console.error("Erreur inattendue callback Supabase auth", {
      error: error instanceof Error ? error.message : String(error),
    })

    const errorPath = withLocalePrefix("/connexion?reason=invalid_link", locale)
    return NextResponse.redirect(new URL(errorPath, requestUrl.origin))
  }
}
