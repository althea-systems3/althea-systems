import { NextResponse } from "next/server"

export const SUPABASE_ADMIN_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const

export const SUPABASE_SERVER_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const

export const CART_COOKIE_ENV_KEYS = ["CART_COOKIE_SECRET"] as const

export const CART_API_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CART_COOKIE_SECRET",
] as const

export const SIGNUP_API_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const

export const REGISTER_API_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const

export type RuntimeConfigKey =
  | (typeof SUPABASE_ADMIN_ENV_KEYS)[number]
  | (typeof SUPABASE_SERVER_ENV_KEYS)[number]
  | (typeof CART_COOKIE_ENV_KEYS)[number]

export type RuntimeConfigValidation = {
  isValid: boolean
  missingKeys: RuntimeConfigKey[]
}

export const CONFIGURATION_MISSING_ERROR_CODE = "configuration_missing" as const

export type ConfigurationMissingApiPayload = {
  error: string
  code: typeof CONFIGURATION_MISSING_ERROR_CODE
}

function isMissingValue(value: string | undefined): boolean {
  return typeof value !== "string" || value.trim().length === 0
}

export function validateRuntimeConfig(
  requiredKeys: readonly RuntimeConfigKey[],
): RuntimeConfigValidation {
  const missingKeys = requiredKeys.filter((key) => {
    return isMissingValue(process.env[key])
  })

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  }
}

export class MissingRuntimeConfigError extends Error {
  readonly feature: string
  readonly missingKeys: RuntimeConfigKey[]

  constructor(feature: string, missingKeys: RuntimeConfigKey[]) {
    super(
      `Missing runtime configuration for ${feature}: ${missingKeys.join(", ")}`,
    )
    this.name = "MissingRuntimeConfigError"
    this.feature = feature
    this.missingKeys = missingKeys
  }
}

export function assertRuntimeConfig(
  feature: string,
  requiredKeys: readonly RuntimeConfigKey[],
): void {
  const validation = validateRuntimeConfig(requiredKeys)

  if (validation.isValid) {
    return
  }

  throw new MissingRuntimeConfigError(feature, validation.missingKeys)
}

export function isMissingRuntimeConfigError(
  error: unknown,
): error is MissingRuntimeConfigError {
  return error instanceof MissingRuntimeConfigError
}

export function logMissingRuntimeConfig(
  feature: string,
  missingKeys: readonly RuntimeConfigKey[],
): void {
  console.error("Configuration serveur manquante", {
    feature,
    missingKeys: [...missingKeys],
  })
}

export function createConfigurationMissingApiPayload(
  featureLabel: string,
): ConfigurationMissingApiPayload {
  return {
    error: `${featureLabel} temporairement indisponible: configuration serveur manquante.`,
    code: CONFIGURATION_MISSING_ERROR_CODE,
  }
}

export function ensureRuntimeConfig(
  feature: string,
  featureLabel: string,
  requiredKeys: readonly RuntimeConfigKey[],
): NextResponse<ConfigurationMissingApiPayload> | null {
  const validation = validateRuntimeConfig(requiredKeys)

  if (validation.isValid) {
    return null
  }

  logMissingRuntimeConfig(feature, validation.missingKeys)

  return NextResponse.json(createConfigurationMissingApiPayload(featureLabel), {
    status: 503,
  })
}

export function handleMissingRuntimeConfigError(
  error: unknown,
  feature: string,
  featureLabel: string,
): NextResponse<ConfigurationMissingApiPayload> | null {
  if (!isMissingRuntimeConfigError(error)) {
    return null
  }

  logMissingRuntimeConfig(feature, error.missingKeys)

  return NextResponse.json(createConfigurationMissingApiPayload(featureLabel), {
    status: 503,
  })
}
