import type { AppLocale } from '@/lib/i18n';

export const HOME_FIXED_TEXT_SLUG = 'texte-fixe-home' as const;

export type HomeFixedTextPayload = {
  slug: typeof HOME_FIXED_TEXT_SLUG;
  locale: AppLocale;
  title: string | null;
  contentMarkdown: string;
  updatedAt: string | null;
  isFallbackData: boolean;
};

export function createEmptyHomeFixedTextPayload(
  locale: AppLocale,
): HomeFixedTextPayload {
  return {
    slug: HOME_FIXED_TEXT_SLUG,
    locale,
    title: null,
    contentMarkdown: '',
    updatedAt: null,
    isFallbackData: true,
  };
}
