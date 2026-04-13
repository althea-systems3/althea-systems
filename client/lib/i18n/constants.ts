export type LanguageDirection = 'ltr' | 'rtl';

export type SupportedLanguage = {
  code: string;
  label: string;
  dir: LanguageDirection;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'es', label: 'Español', dir: 'ltr' },
];

export const DEFAULT_LANGUAGE = 'fr';

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_CODES.has(code);
}

export function getLanguageDir(code: string): LanguageDirection {
  const language = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return language?.dir ?? 'ltr';
}
