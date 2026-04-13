import { describe, expect, it } from 'vitest';

import { sanitizeText } from '@/lib/auth/sanitize';

describe('sanitizeText', () => {
  it('retourne une chaîne vide pour les non-strings', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(42)).toBe('');
    expect(sanitizeText({})).toBe('');
  });

  it('supprime les balises HTML', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe(
      'alert("xss")',
    );
    expect(sanitizeText('<b>gras</b>')).toBe('gras');
    expect(sanitizeText('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('supprime les balises imbriquées et malformées', () => {
    expect(sanitizeText('<div><p>texte</p></div>')).toBe('texte');
    expect(sanitizeText('a <b>b <i>c</i> d</b> e')).toBe('a b c d e');
  });

  it('collapse les espaces excessifs', () => {
    expect(sanitizeText('a     b')).toBe('a  b');
    expect(sanitizeText('a   b   c')).toBe('a  b  c');
  });

  it('préserve les espaces doubles', () => {
    expect(sanitizeText('a  b')).toBe('a  b');
  });

  it('trim les espaces', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('respecte maxLength', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeText(long, 10)).toBe('a'.repeat(10));
  });

  it('préserve le texte normal inchangé', () => {
    expect(sanitizeText('Bonjour le monde')).toBe('Bonjour le monde');
    expect(sanitizeText("L'été est chaud")).toBe("L'été est chaud");
  });
});
