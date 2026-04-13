import type { AppLocale } from '@/lib/i18n';

export const STATIC_PAGE_SLUGS = [
  'cgu',
  'mentions-legales',
  'a-propos',
] as const;

export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number];

export type StaticPageDefaultContent = {
  title: string;
  description: string;
};

export const STATIC_PAGE_DEFAULTS: Record<
  StaticPageSlug,
  StaticPageDefaultContent
> = {
  cgu: {
    title: "Conditions Generales d'Utilisation",
    description:
      "Consultez ici l'ensemble des conditions applicables a l'utilisation du site Althea Systems.",
  },
  'mentions-legales': {
    title: 'Mentions legales',
    description:
      'Retrouvez les informations juridiques et editoriales du site e-commerce.',
  },
  'a-propos': {
    title: 'A propos de Althea Systems',
    description:
      'Althea Systems accompagne les entreprises avec une plateforme e-commerce performante et evolutive.',
  },
};

export type StaticPageContentPayload = {
  slug: StaticPageSlug;
  locale: AppLocale;
  title: string;
  description: string | null;
  contentMarkdown: string;
  updatedAt: string | null;
  isFallbackData: boolean;
};

export function isStaticPageSlug(value: string): value is StaticPageSlug {
  return STATIC_PAGE_SLUGS.includes(value as StaticPageSlug);
}
