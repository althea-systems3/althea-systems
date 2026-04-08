import type { MetadataRoute } from "next"

import { locales } from "@/lib/i18n"

const MAIN_PAGE_PATHS = [
  "/",
  "/contact",
  "/chatbot",
  "/a-propos",
  "/cgu",
  "/mentions-legales",
]

function getBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!configuredBaseUrl) {
    return "http://localhost:3000"
  }

  return configuredBaseUrl.replace(/\/$/, "")
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl()
  const now = new Date()

  return locales.flatMap((locale) => {
    return MAIN_PAGE_PATHS.map((path) => {
      const localizedPath = path === "/" ? `/${locale}` : `/${locale}${path}`

      return {
        url: `${baseUrl}${localizedPath}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: path === "/" ? 1 : 0.8,
      }
    })
  })
}
