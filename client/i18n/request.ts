import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale
  const effectiveLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale

  return {
    locale: effectiveLocale,
    messages: (await import(`../messages/${effectiveLocale}.json`)).default,
  }
})
