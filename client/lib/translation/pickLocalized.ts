import { isAppLocale, toAppLocale, type AppLocale } from "@/lib/i18n"

type TraductionsMap = Record<
  string,
  Record<string, string | Record<string, string> | null>
> | null

type RowWithTraductions = {
  traductions?: TraductionsMap | unknown
  source_locale?: string | null
}

function readTraductions(row: RowWithTraductions): TraductionsMap {
  if (!row.traductions) return null
  if (typeof row.traductions !== "object") return null
  return row.traductions as TraductionsMap
}

export function pickLocalizedString<T extends string | null>(
  row: RowWithTraductions,
  fieldKey: string,
  locale: AppLocale,
  fallback: T,
): T | string {
  const sourceLocale = isAppLocale(row.source_locale ?? "")
    ? (row.source_locale as AppLocale)
    : null

  if (sourceLocale && sourceLocale === locale) {
    return fallback
  }

  const traductions = readTraductions(row)
  if (!traductions) return fallback

  const localized = traductions[locale]
  if (!localized) return fallback

  const value = localized[fieldKey]
  return typeof value === "string" && value.length > 0 ? value : fallback
}

export function pickLocalizedRecord(
  row: RowWithTraductions,
  fieldKey: string,
  locale: AppLocale,
  fallback: Record<string, string> | null,
): Record<string, string> | null {
  const sourceLocale = isAppLocale(row.source_locale ?? "")
    ? (row.source_locale as AppLocale)
    : null

  if (sourceLocale && sourceLocale === locale) {
    return fallback
  }

  const traductions = readTraductions(row)
  if (!traductions) return fallback

  const localized = traductions[locale]
  if (!localized) return fallback

  const value = localized[fieldKey]
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return fallback
  }

  return value as Record<string, string>
}

export function getRequestLocale(request?: Request | null): AppLocale {
  if (!request) {
    return toAppLocale(null)
  }

  const rawUrl = typeof request.url === "string" ? request.url : null
  if (rawUrl) {
    try {
      const url = new URL(rawUrl)
      const queryLocale = url.searchParams.get("locale")
      if (queryLocale && isAppLocale(queryLocale)) {
        return queryLocale
      }
    } catch {
      // ignore — fall through to header-based detection
    }
  }

  const headers =
    request.headers && typeof request.headers.get === "function"
      ? request.headers
      : null

  const referer = headers?.get("referer") ?? null
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const segment = refererUrl.pathname.split("/").filter(Boolean)[0]
      if (segment && isAppLocale(segment)) {
        return segment
      }
    } catch {
      // ignore
    }
  }

  const acceptLanguage = headers?.get("accept-language") ?? null
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.trim().split("-")[0]
    if (primary && isAppLocale(primary)) {
      return primary
    }
  }

  return toAppLocale(null)
}
