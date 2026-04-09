export const locales = ["fr", "en", "ar", "es"] as const

export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = "fr"

export const localeLabels: Record<AppLocale, string> = {
  fr: "FR",
  en: "EN",
  ar: "AR",
  es: "ES",
}

export const localeDisplayNames: Record<AppLocale, string> = {
  fr: "Francais",
  en: "English",
  ar: "العربية",
  es: "Espanol",
}

export function isAppLocale(locale: string): locale is AppLocale {
  return locales.includes(locale as AppLocale)
}

export function toAppLocale(locale: string | null | undefined): AppLocale {
  if (locale && isAppLocale(locale)) {
    return locale
  }

  return defaultLocale
}

export function isRtlLocale(locale: string): boolean {
  return locale === "ar"
}
