import { describe, expect, it } from 'vitest';

import {
  normalizeString,
  getAddressValidationError,
  getProfileValidationError,
  getPaymentMethodValidationError,
  getPaymentMethodUpdateValidationError,
  parsePaginationParams,
} from '@/lib/account/validation';

// --- normalizeString ---

describe('normalizeString', () => {
  it('retourne une chaîne trimmée', () => {
    expect(normalizeString('  hello  ')).toBe('hello');
  });

  it('retourne chaîne vide pour non-string', () => {
    expect(normalizeString(null)).toBe('');
    expect(normalizeString(undefined)).toBe('');
    expect(normalizeString(42)).toBe('');
  });
});

// --- getAddressValidationError ---

describe('getAddressValidationError', () => {
  const VALID_ADDRESS = {
    firstName: 'Jean',
    lastName: 'Dupont',
    address1: '10 rue de la Paix',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
    phone: '0612345678',
  };

  it('retourne null pour une adresse valide', () => {
    expect(getAddressValidationError(VALID_ADDRESS)).toBeNull();
  });

  it('retourne invalid_payload pour null', () => {
    expect(getAddressValidationError(null)).toBe('invalid_payload');
  });

  it('retourne first_name_required si prénom manquant', () => {
    expect(
      getAddressValidationError({ ...VALID_ADDRESS, firstName: '' }),
    ).toBe('first_name_required');
  });

  it('retourne city_required si ville manquante', () => {
    expect(
      getAddressValidationError({ ...VALID_ADDRESS, city: '' }),
    ).toBe('city_required');
  });
});

// --- getProfileValidationError ---

describe('getProfileValidationError', () => {
  const VALID_PROFILE = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean@example.com',
    phone: '',
  };

  it('retourne null pour un profil valide', () => {
    expect(getProfileValidationError(VALID_PROFILE)).toBeNull();
  });

  it('retourne email_required si email manquant', () => {
    expect(
      getProfileValidationError({ ...VALID_PROFILE, email: '' }),
    ).toBe('email_required');
  });

  it('retourne email_invalid si email invalide', () => {
    expect(
      getProfileValidationError({ ...VALID_PROFILE, email: 'not-email' }),
    ).toBe('email_invalid');
  });

  it('retourne phone_invalid si téléphone invalide', () => {
    expect(
      getProfileValidationError({ ...VALID_PROFILE, phone: 'abc' }),
    ).toBe('phone_invalid');
  });

  it('accepte un téléphone valide', () => {
    expect(
      getProfileValidationError({ ...VALID_PROFILE, phone: '+33 6 12 34 56 78' }),
    ).toBeNull();
  });
});

// --- getPaymentMethodValidationError ---

describe('getPaymentMethodValidationError', () => {
  const VALID_PM = {
    cardHolder: 'Jean Dupont',
    last4: '4242',
    expiry: '12/27',
    stripePaymentId: 'pm_xxx',
  };

  it('retourne null pour un paiement valide', () => {
    expect(getPaymentMethodValidationError(VALID_PM)).toBeNull();
  });

  it('retourne card_holder_required si manquant', () => {
    expect(
      getPaymentMethodValidationError({ ...VALID_PM, cardHolder: '' }),
    ).toBe('card_holder_required');
  });

  it('retourne last4_invalid si invalide', () => {
    expect(
      getPaymentMethodValidationError({ ...VALID_PM, last4: '42' }),
    ).toBe('last4_invalid');
  });

  it('retourne expiry_invalid si format incorrect', () => {
    expect(
      getPaymentMethodValidationError({ ...VALID_PM, expiry: '13/27' }),
    ).toBe('expiry_invalid');
  });

  it('retourne stripe_payment_id_required si manquant', () => {
    expect(
      getPaymentMethodValidationError({ ...VALID_PM, stripePaymentId: '' }),
    ).toBe('stripe_payment_id_required');
  });
});

// --- getPaymentMethodUpdateValidationError ---

describe('getPaymentMethodUpdateValidationError', () => {
  it('retourne null si cardHolder fourni', () => {
    expect(
      getPaymentMethodUpdateValidationError({ cardHolder: 'Jean' }),
    ).toBeNull();
  });

  it('retourne no_changes_requested si rien fourni', () => {
    expect(
      getPaymentMethodUpdateValidationError({}),
    ).toBe('no_changes_requested');
  });

  it('retourne expiry_invalid si format incorrect', () => {
    expect(
      getPaymentMethodUpdateValidationError({ expiry: 'bad' }),
    ).toBe('expiry_invalid');
  });

  it('retourne null si isDefault true', () => {
    expect(
      getPaymentMethodUpdateValidationError({ isDefault: true }),
    ).toBeNull();
  });
});

// --- parsePaginationParams ---

describe('parsePaginationParams', () => {
  it('retourne les valeurs par défaut', () => {
    const params = new URLSearchParams();
    const result = parsePaginationParams(params, 10, 50);

    expect(result).toEqual({ limit: 10, offset: 0 });
  });

  it('parse limit et offset', () => {
    const params = new URLSearchParams('limit=20&offset=5');
    const result = parsePaginationParams(params, 10, 50);

    expect(result).toEqual({ limit: 20, offset: 5 });
  });

  it('plafonne limit au maximum', () => {
    const params = new URLSearchParams('limit=100');
    const result = parsePaginationParams(params, 10, 50);

    expect(result.limit).toBe(50);
  });

  it('ignore les valeurs invalides', () => {
    const params = new URLSearchParams('limit=abc&offset=-1');
    const result = parsePaginationParams(params, 10, 50);

    expect(result).toEqual({ limit: 10, offset: 0 });
  });
});
