import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { EmailOtpType } from "@supabase/supabase-js"

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

function appendQueryParam(path: string, key: string, value: string): string {
  const [pathname, queryString = ""] = path.split("?")
  const searchParams = new URLSearchParams(queryString)
  searchParams.set(key, value)

  const nextQueryString = searchParams.toString()

  if (!nextQueryString) {
    return pathname
  }

  return `${pathname}?${nextQueryString}`
}

function buildResetRedirectPath(
  locale: AppLocale,
  status: "invalid" | "expired" | "ready",
  nextPath: string | null,
): string {
  const localizedResetPath = withLocalePrefix(
    "/reinitialisation-mot-de-passe",
    locale,
  )

  let redirectPath = appendQueryParam(localizedResetPath, "recovery", status)

  if (nextPath) {
    redirectPath = appendQueryParam(redirectPath, "next", nextPath)
  }

  return redirectPath
}

function getRecoveryErrorStatus(errorMessage: string): "invalid" | "expired" {
  const normalizedMessage = errorMessage.toLowerCase()

  if (normalizedMessage.includes("expired")) {
    return "expired"
  }

  return "invalid"
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const tokenHash = normalizeString(requestUrl.searchParams.get("token_hash"))
  const otpType = normalizeString(requestUrl.searchParams.get("type"))

  const locale = getSafeLocale(requestUrl.searchParams.get("locale"))
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"))

  if (!tokenHash || !otpType) {
    const invalidRedirectPath = buildResetRedirectPath(
      locale,
      "invalid",
      nextPath,
    )

    return NextResponse.redirect(new URL(invalidRedirectPath, request.url))
  }

  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const { error } = await supabaseClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    })

    if (error) {
      const errorStatus = getRecoveryErrorStatus(error.message)
      const errorRedirectPath = buildResetRedirectPath(
        locale,
        errorStatus,
        nextPath,
      )

      return NextResponse.redirect(new URL(errorRedirectPath, request.url))
    }

    const successRedirectPath = buildResetRedirectPath(
      locale,
      "ready",
      nextPath,
    )

    return NextResponse.redirect(new URL(successRedirectPath, request.url))
  } catch (error) {
    console.error("Erreur inattendue callback reset password", { error })

    const invalidRedirectPath = buildResetRedirectPath(
      locale,
      "invalid",
      nextPath,
    )

    return NextResponse.redirect(new URL(invalidRedirectPath, request.url))
  }
}
