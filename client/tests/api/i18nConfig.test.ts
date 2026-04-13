import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/i18n/config/route';

describe('GET /api/i18n/config', () => {
  it('retourne 200 avec la liste des langues', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.languages).toBeInstanceOf(Array);
    expect(body.languages.length).toBeGreaterThanOrEqual(4);
    expect(body.default_language).toBe('fr');
  });

  it('chaque langue a code, label et dir', async () => {
    const response = await GET();
    const body = await response.json();

    for (const lang of body.languages) {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('label');
      expect(lang).toHaveProperty('dir');
      expect(['ltr', 'rtl']).toContain(lang.dir);
    }
  });

  it('ar est rtl', async () => {
    const response = await GET();
    const body = await response.json();

    const arabic = body.languages.find(
      (l: { code: string }) => l.code === 'ar',
    );
    expect(arabic).toBeDefined();
    expect(arabic.dir).toBe('rtl');
  });

  it('fr et en sont ltr', async () => {
    const response = await GET();
    const body = await response.json();

    const french = body.languages.find(
      (l: { code: string }) => l.code === 'fr',
    );
    const english = body.languages.find(
      (l: { code: string }) => l.code === 'en',
    );
    expect(french.dir).toBe('ltr');
    expect(english.dir).toBe('ltr');
  });
});
