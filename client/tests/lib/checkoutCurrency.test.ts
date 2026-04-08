import { describe, expect, it } from 'vitest';

import { roundCurrency, formatEuros } from '@/lib/checkout/currency';

describe('roundCurrency', () => {
  it('arrondit à 2 décimales', () => {
    expect(roundCurrency(10.456)).toBe(10.46);
  });

  it('conserve les valeurs déjà arrondies', () => {
    expect(roundCurrency(99.99)).toBe(99.99);
  });

  it('gère zéro', () => {
    expect(roundCurrency(0)).toBe(0);
  });

  it('gère les erreurs de virgule flottante', () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });
});

describe('formatEuros', () => {
  it('formate avec 2 décimales et le symbole euro', () => {
    expect(formatEuros(1299.9)).toBe('1299.90 €');
  });

  it('formate un entier avec 2 décimales', () => {
    expect(formatEuros(100)).toBe('100.00 €');
  });

  it('formate zéro', () => {
    expect(formatEuros(0)).toBe('0.00 €');
  });
});
