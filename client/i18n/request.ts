import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import type { AppLocale } from "@/lib/i18n"
import { loadMessagesWithFallback } from "@/lib/i18nMessages"

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale
  const effectiveLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale

  return {
    locale: effectiveLocale,
    messages: await loadMessagesWithFallback(effectiveLocale as AppLocale),
  }
})
