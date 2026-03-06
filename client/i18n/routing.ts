import { defineRouting } from "next-intl/routing"
import { defaultLocale, locales } from "@/lib/i18n"

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
})
