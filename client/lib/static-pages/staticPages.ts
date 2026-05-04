import type { AppLocale } from "@/lib/i18n"

export const STATIC_PAGE_SLUGS = [
  "cgu",
  "mentions-legales",
  "a-propos",
] as const

export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number]

export type StaticPageDefaultContent = {
  title: string
  description: string
}

export const STATIC_PAGE_DEFAULTS: Record<
  StaticPageSlug,
  StaticPageDefaultContent
> = {
  cgu: {
    title: "Conditions Générales d'Utilisation",
    description:
      "Ces CGU précisent les règles d'accès, de commande et de responsabilité applicables à la plateforme Althea Systems.",
  },
  "mentions-legales": {
    title: "Mentions légales",
    description:
      "Informations juridiques, techniques et éditoriales encadrant l'exploitation du site Althea Systems.",
  },
  "a-propos": {
    title: "À propos d'Althea Systems",
    description:
      "Althea Systems accompagne les professionnels de santé avec une plateforme e-commerce fiable, claire et orientée résultats.",
  },
}

export type StaticPageContentPayload = {
  slug: StaticPageSlug
  locale: AppLocale
  title: string
  description: string | null
  contentMarkdown: string
  updatedAt: string | null
  isFallbackData: boolean
}

export function isStaticPageSlug(value: string): value is StaticPageSlug {
  return STATIC_PAGE_SLUGS.includes(value as StaticPageSlug)
}
