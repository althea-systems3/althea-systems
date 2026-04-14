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
    title: "Conditions Generales d'Utilisation",
    description:
      "Ces CGU precisent les regles d'acces, de commande et de responsabilite applicables a la plateforme Althea Systems.",
  },
  "mentions-legales": {
    title: "Mentions legales",
    description:
      "Consultez les informations juridiques, techniques et editoriales encadrant l'exploitation du site Althea Systems.",
  },
  "a-propos": {
    title: "A propos de Althea Systems",
    description:
      "Althea Systems accompagne les professionnels avec une plateforme e-commerce fiable, claire et orientee resultats.",
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
