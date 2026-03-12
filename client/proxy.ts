import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import createIntlMiddleware from "next-intl/middleware"

import { routing } from "@/i18n/routing"
import { locales, defaultLocale } from "@/lib/i18n"

const intlMiddleware = createIntlMiddleware(routing)

const PROTECTED_PATHS = ["/mes-parametres", "/mes-commandes"]
const AUTH_PATHS = ["/connexion", "/inscription"]
const ADMIN_API_PREFIX = "/api/admin"

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // NOTE: Les routes /api/admin/* sont protégées au niveau du proxy
  const isAdminApiRoute = pathname.startsWith(ADMIN_API_PREFIX)

  if (isAdminApiRoute) {
    return handleAdminApiRoute(request)
  }

  const intlResponse = intlMiddleware(request)

  const pathWithoutLocale = extractPathWithoutLocale(pathname)
  const isProtectedRoute = PROTECTED_PATHS.some((path) =>
    pathWithoutLocale.startsWith(path),
  )
  const isAuthRoute = AUTH_PATHS.some((path) =>
    pathWithoutLocale.startsWith(path),
  )
  const hasSupabaseAuthConfiguration =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!isProtectedRoute && !isAuthRoute) {
    return intlResponse
  }

  if (!hasSupabaseAuthConfiguration) {
    if (isProtectedRoute) {
      const locale = extractLocale(request.nextUrl.pathname)
      return NextResponse.redirect(new URL(`/${locale}/connexion`, request.url))
    }

    return intlResponse
  }

  const supabaseClient = createSupabaseProxyClient(request, intlResponse)
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()
  const locale = extractLocale(request.nextUrl.pathname)

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL(`/${locale}/connexion`, request.url))
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url))
  }

  return intlResponse
}

function extractLocale(pathname: string): string {
  const firstSegment = pathname.split("/")[1]
  const isKnownLocale = locales.includes(
    firstSegment as (typeof locales)[number],
  )

  return isKnownLocale ? firstSegment : defaultLocale
}

function extractPathWithoutLocale(pathname: string): string {
  const locale = extractLocale(pathname)

  return pathname.replace(`/${locale}`, "") || "/"
}

function createSupabaseProxyClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )
}

async function handleAdminApiRoute(
  request: NextRequest,
): Promise<NextResponse> {
  const hasSupabaseConfig =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!hasSupabaseConfig) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    )
  }

  const response = NextResponse.next()
  const supabaseClient = createSupabaseProxyClient(request, response)

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    )
  }

  return response
}

export const config = {
  matcher: [
    "/((?!trpc|_next|_vercel|.*\\..*).(?!api/(?!admin)).*)",
    "/api/admin/:path*",
  ],
}
