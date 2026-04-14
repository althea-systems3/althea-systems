import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { verifyCsrf } from "@/lib/auth/csrf"
import { validateRegistrationPayload } from "@/lib/auth/validation"
import { generateVerificationToken, computeTokenExpiry } from "@/lib/auth/token"
import { registerRateLimiter, getClientIp } from "@/lib/auth/rateLimiter"
import { sendVerificationEmail } from "@/lib/auth/email"
import { logAuthActivity } from "@/lib/auth/logAuthActivity"
import { REGISTER_SUCCESS_MESSAGE } from "@/lib/auth/constants"
import {
  REGISTER_API_ENV_KEYS,
  createConfigurationMissingApiPayload,
  isMissingRuntimeConfigError,
  logMissingRuntimeConfig,
  validateRuntimeConfig,
} from "@/lib/config/runtime"

// --- Constantes ---

const DUPLICATE_EMAIL_ERROR = "already been registered"
const REGISTER_REPLACEMENT_ENDPOINT = "/api/auth/signup"
const REGISTER_SUNSET_TIMESTAMP = Date.parse("2027-01-01T00:00:00.000Z")
const REGISTER_DEPRECATION_HEADERS = {
  Deprecation: "true",
  Sunset: "Wed, 31 Dec 2026 23:59:59 GMT",
  Link: `<${REGISTER_REPLACEMENT_ENDPOINT}>; rel="successor-version"`,
  "X-Althea-Replacement-Endpoint": REGISTER_REPLACEMENT_ENDPOINT,
}

// --- Helpers ---

function buildVerificationUrl(rawToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  return `${baseUrl}/api/auth/verify-email?token=${rawToken}`
}

function withRegisterDeprecationHeaders(response: NextResponse): NextResponse {
  Object.entries(REGISTER_DEPRECATION_HEADERS).forEach(
    ([headerName, value]) => {
      response.headers.set(headerName, value)
    },
  )

  return response
}

function isRegisterEndpointSunsetReached(referenceDate = new Date()): boolean {
  return referenceDate.getTime() >= REGISTER_SUNSET_TIMESTAMP
}

function createRegisterSunsetResponse(): NextResponse {
  return withRegisterDeprecationHeaders(
    NextResponse.json(
      {
        error:
          "Endpoint legacy d'inscription retire. Utilisez /api/auth/signup.",
        code: "endpoint_sunset",
        replacementEndpoint: REGISTER_REPLACEMENT_ENDPOINT,
      },
      { status: 410 },
    ),
  )
}

// --- Handler ---

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (isRegisterEndpointSunsetReached()) {
    console.warn("Endpoint /api/auth/register retire apres sunset", {
      replacementEndpoint: REGISTER_REPLACEMENT_ENDPOINT,
      sunset: REGISTER_DEPRECATION_HEADERS.Sunset,
    })

    return createRegisterSunsetResponse()
  }

  // NOTE: Rate limiting
  const clientIp = getClientIp(request)

  if (registerRateLimiter.isRateLimited(clientIp)) {
    return withRegisterDeprecationHeaders(
      NextResponse.json(
        {
          error: "Trop de tentatives. Réessayez plus tard.",
          code: "rate_limited",
        },
        { status: 429 },
      ),
    )
  }

  const configValidation = validateRuntimeConfig(REGISTER_API_ENV_KEYS)

  if (!configValidation.isValid) {
    logMissingRuntimeConfig(
      "api.auth.register.post",
      configValidation.missingKeys,
    )

    return withRegisterDeprecationHeaders(
      NextResponse.json(createConfigurationMissingApiPayload("Inscription"), {
        status: 503,
      }),
    )
  }

  // NOTE: Protection CSRF
  const csrfError = verifyCsrf(request)

  if (csrfError) {
    return withRegisterDeprecationHeaders(csrfError)
  }

  try {
    const body = await request.json().catch(() => null)
    const validation = validateRegistrationPayload(body)

    if ("errors" in validation) {
      return withRegisterDeprecationHeaders(
        NextResponse.json(
          {
            errors: validation.errors,
            code: "invalid_payload",
          },
          { status: 400 },
        ),
      )
    }

    const { email, password, nomComplet } = validation.data
    const supabaseAdmin = createAdminClient()

    // NOTE: Créer l'utilisateur via Supabase Auth (gère le hash bcrypt)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { nom_complet: nomComplet },
      })

    // NOTE: Anti-énumération — même réponse si email déjà pris
    if (authError) {
      if (authError.message?.includes(DUPLICATE_EMAIL_ERROR)) {
        return withRegisterDeprecationHeaders(
          NextResponse.json(
            {
              message: REGISTER_SUCCESS_MESSAGE,
              code: "register_created",
            },
            { status: 201 },
          ),
        )
      }

      console.error("Erreur création utilisateur Supabase Auth", {
        error: authError.message,
      })

      return withRegisterDeprecationHeaders(
        NextResponse.json(
          {
            error: "Erreur lors de la création du compte.",
            code: "server_error",
          },
          { status: 500 },
        ),
      )
    }

    if (!authData.user) {
      return withRegisterDeprecationHeaders(
        NextResponse.json(
          {
            error: "Erreur lors de la création du compte.",
            code: "server_error",
          },
          { status: 500 },
        ),
      )
    }

    // NOTE: Générer le token de vérification
    const { rawToken, tokenHash } = generateVerificationToken()
    const tokenExpiry = computeTokenExpiry()

    // NOTE: Mettre à jour le profil utilisateur (trigger a créé la row)
    await supabaseAdmin
      .from("utilisateur")
      .update({
        validation_token_hash: tokenHash,
        validation_token_expires_at: tokenExpiry.toISOString(),
        cgu_acceptee_le: new Date().toISOString(),
      } as never)
      .eq("id_utilisateur", authData.user.id)

    // NOTE: Envoyer l'email de vérification (non bloquant)
    const verificationUrl = buildVerificationUrl(rawToken)

    sendVerificationEmail({
      recipientEmail: email,
      customerName: nomComplet,
      verificationUrl,
    }).catch((emailError) => {
      console.error("Erreur envoi email vérification", { emailError })
    })

    // NOTE: Journalisation (non bloquant)
    logAuthActivity("auth.register", {
      userId: authData.user.id,
      email,
    }).catch(() => {})

    return withRegisterDeprecationHeaders(
      NextResponse.json(
        {
          message: REGISTER_SUCCESS_MESSAGE,
          code: "register_created",
        },
        { status: 201 },
      ),
    )
  } catch (error) {
    if (isMissingRuntimeConfigError(error)) {
      logMissingRuntimeConfig("api.auth.register.post", error.missingKeys)

      return withRegisterDeprecationHeaders(
        NextResponse.json(createConfigurationMissingApiPayload("Inscription"), {
          status: 503,
        }),
      )
    }

    console.error("Erreur inattendue inscription", { error })
    return withRegisterDeprecationHeaders(
      NextResponse.json(
        {
          error: "Erreur serveur",
          code: "server_error",
        },
        { status: 500 },
      ),
    )
  }
}
