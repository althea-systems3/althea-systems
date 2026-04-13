import { CHATBOT_MAX_MESSAGE_LENGTH, CHATBOT_RATE_LIMIT_PER_MINUTE, CHATBOT_RATE_LIMIT_PER_HOUR } from "@/lib/contact/constants"

// ─── Injection patterns ────────────────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(tes|vos|les|your|my)\s+instructions/i,
  /tu\s+es\s+maintenant/i,
  /you\s+are\s+now/i,
  /oublie\s+(tout|tes\s+r.gles|tes\s+regles)/i,
  /forget\s+(all|your\s+instructions|everything)/i,
  /system\s*prompt/i,
  /\bDAN\b/,
  /jailbreak/i,
  /act\s+as\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /ignore\s+previous/i,
  /new\s+instructions/i,
  /override\s+(your\s+)?(instructions|rules|system)/i,
  /en\s+tant\s+que\s+(DAN|assistant\s+sans\s+limites)/i,
  /tu\s+n.as\s+plus\s+de\s+r.gles/i,
]

// ─── Sensitive data patterns ───────────────────────────────────────────────────
const CARD_NUMBER_PATTERN = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/
const PASSWORD_PATTERN = /\b(mot\s*de\s*passe|password|mdp)\s*[:=\s]\s*\S+/i

// ─── Rate limiter (in-memory, per process) ─────────────────────────────────────
type RateEntry = {
  minuteCount: number
  hourCount: number
  minuteReset: number
  hourReset: number
}

const rateLimitStore = new Map<string, RateEntry>()

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.hourReset) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "minute" | "hour" }

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now()
  const existing = rateLimitStore.get(identifier)

  if (!existing) {
    rateLimitStore.set(identifier, {
      minuteCount: 1,
      hourCount: 1,
      minuteReset: now + 60_000,
      hourReset: now + 3_600_000,
    })
    return { allowed: true }
  }

  // Reset minute window if expired
  if (now > existing.minuteReset) {
    existing.minuteCount = 0
    existing.minuteReset = now + 60_000
  }

  // Reset hour window if expired
  if (now > existing.hourReset) {
    existing.hourCount = 0
    existing.hourReset = now + 3_600_000
  }

  existing.minuteCount++
  existing.hourCount++
  rateLimitStore.set(identifier, existing)

  if (existing.minuteCount > CHATBOT_RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, reason: "minute" }
  }

  if (existing.hourCount > CHATBOT_RATE_LIMIT_PER_HOUR) {
    return { allowed: false, reason: "hour" }
  }

  return { allowed: true }
}

export type SecurityCheckResult =
  | { safe: true; sanitized: string }
  | { safe: false; reason: "too_long" | "injection" | "sensitive_data" }

export function securityCheck(message: string): SecurityCheckResult {
  const trimmed = message.trim()

  if (trimmed.length > CHATBOT_MAX_MESSAGE_LENGTH) {
    return { safe: false, reason: "too_long" }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: "injection" }
    }
  }

  if (CARD_NUMBER_PATTERN.test(trimmed) || PASSWORD_PATTERN.test(trimmed)) {
    return { safe: false, reason: "sensitive_data" }
  }

  // Sanitize HTML/JS
  const sanitized = trimmed
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")

  return { safe: true, sanitized }
}
