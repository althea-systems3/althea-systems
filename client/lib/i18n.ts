export const locales = ["fr", "en", "ar", "he"] as const

export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = "fr"

export function isRtlLocale(locale: AppLocale): boolean {
  return locale === "ar" || locale === "he"
}
