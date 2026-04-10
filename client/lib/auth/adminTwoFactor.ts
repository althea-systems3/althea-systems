import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto"

import {
  ADMIN_2FA_CHALLENGE_TTL_SECONDS,
  ADMIN_2FA_MAX_ATTEMPTS,
  ADMIN_2FA_VERIFIED_TTL_SECONDS,
} from "@/lib/auth/constants"

type AdminTwoFactorChallengePayload = {
  userId: string
  expiresAt: number
  nonce: string
  codeHash: string
  attempts: number
}

type AdminTwoFactorVerifiedPayload = {
  userId: string
  expiresAt: number
}

export type AdminTwoFactorChallengeResult = {
  code: string
  token: string
  expiresAt: number
}

export type AdminTwoFactorChallengeVerificationResult =
  | {
      status: "verified"
      nextToken: null
    }
  | {
      status: "missing_or_invalid"
      nextToken: null
    }
  | {
      status: "expired"
      nextToken: null
    }
  | {
      status: "locked"
      nextToken: null
    }
  | {
      status: "invalid_code"
      nextToken: string | null
    }

const ADMIN_2FA_CODE_LENGTH = 6

function getAdminTwoFactorSecret(): string {
  return (
    process.env.ADMIN_2FA_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "althea-admin-2fa-dev-secret"
  )
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getAdminTwoFactorSecret())
    .update(encodedPayload)
    .digest("base64url")
}

function encodeSignedPayload(payload: object): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf-8").toString(
    "base64url",
  )
  const signature = signPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

function decodeSignedPayload<TPayload extends object>(
  token: string,
): TPayload | null {
  const [encodedPayload, signature] = token.split(".")

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)

  if (signature.length !== expectedSignature.length) {
    return null
  }

  const isSignatureValid = timingSafeEqual(
    Buffer.from(signature, "utf-8"),
    Buffer.from(expectedSignature, "utf-8"),
  )

  if (!isSignatureValid) {
    return null
  }

  try {
    const decodedPayload = Buffer.from(encodedPayload, "base64url").toString(
      "utf-8",
    )

    return JSON.parse(decodedPayload) as TPayload
  } catch {
    return null
  }
}

function hashCode(
  code: string,
  userId: string,
  nonce: string,
  expiresAt: number,
): string {
  return createHash("sha256")
    .update(`${code}:${userId}:${nonce}:${expiresAt}`)
    .digest("hex")
}

function isKnownChallengePayload(
  payload: AdminTwoFactorChallengePayload | null,
): payload is AdminTwoFactorChallengePayload {
  if (!payload) {
    return false
  }

  return (
    typeof payload.userId === "string" &&
    typeof payload.nonce === "string" &&
    typeof payload.codeHash === "string" &&
    typeof payload.expiresAt === "number" &&
    typeof payload.attempts === "number"
  )
}

export function normalizeAdminTwoFactorCode(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().replaceAll(" ", "")
}

export function isValidAdminTwoFactorCode(code: string): boolean {
  const otpPattern = new RegExp(`^\\d{${ADMIN_2FA_CODE_LENGTH}}$`)
  return otpPattern.test(code)
}

export function createAdminTwoFactorChallenge(
  userId: string,
): AdminTwoFactorChallengeResult {
  const code = String(randomInt(0, 10 ** ADMIN_2FA_CODE_LENGTH)).padStart(
    ADMIN_2FA_CODE_LENGTH,
    "0",
  )
  const expiresAt = Date.now() + ADMIN_2FA_CHALLENGE_TTL_SECONDS * 1000
  const nonce = randomBytes(16).toString("hex")
  const codeHash = hashCode(code, userId, nonce, expiresAt)

  const token = encodeSignedPayload({
    userId,
    expiresAt,
    nonce,
    codeHash,
    attempts: 0,
  } satisfies AdminTwoFactorChallengePayload)

  return {
    code,
    token,
    expiresAt,
  }
}

export function verifyAdminTwoFactorChallenge(params: {
  token: string
  userId: string
  code: string
}): AdminTwoFactorChallengeVerificationResult {
  const decoded = decodeSignedPayload<AdminTwoFactorChallengePayload>(
    params.token,
  )

  if (!isKnownChallengePayload(decoded)) {
    return {
      status: "missing_or_invalid",
      nextToken: null,
    }
  }

  if (decoded.userId !== params.userId) {
    return {
      status: "missing_or_invalid",
      nextToken: null,
    }
  }

  if (Date.now() > decoded.expiresAt) {
    return {
      status: "expired",
      nextToken: null,
    }
  }

  if (decoded.attempts >= ADMIN_2FA_MAX_ATTEMPTS) {
    return {
      status: "locked",
      nextToken: null,
    }
  }

  const expectedCodeHash = hashCode(
    params.code,
    params.userId,
    decoded.nonce,
    decoded.expiresAt,
  )

  const isCodeValid = timingSafeEqual(
    Buffer.from(decoded.codeHash, "hex"),
    Buffer.from(expectedCodeHash, "hex"),
  )

  if (isCodeValid) {
    return {
      status: "verified",
      nextToken: null,
    }
  }

  const nextAttempts = decoded.attempts + 1

  if (nextAttempts >= ADMIN_2FA_MAX_ATTEMPTS) {
    return {
      status: "locked",
      nextToken: null,
    }
  }

  const nextToken = encodeSignedPayload({
    ...decoded,
    attempts: nextAttempts,
  } satisfies AdminTwoFactorChallengePayload)

  return {
    status: "invalid_code",
    nextToken,
  }
}

export function createAdminTwoFactorVerifiedToken(userId: string): string {
  const expiresAt = Date.now() + ADMIN_2FA_VERIFIED_TTL_SECONDS * 1000

  return encodeSignedPayload({
    userId,
    expiresAt,
  } satisfies AdminTwoFactorVerifiedPayload)
}

export function isAdminTwoFactorVerified(
  token: string | undefined | null,
  userId: string,
): boolean {
  if (!token) {
    return false
  }

  const decoded = decodeSignedPayload<AdminTwoFactorVerifiedPayload>(token)

  if (!decoded) {
    return false
  }

  if (decoded.userId !== userId) {
    return false
  }

  return Date.now() <= decoded.expiresAt
}
