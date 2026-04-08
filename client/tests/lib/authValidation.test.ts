import { describe, expect, it } from 'vitest';

import {
  validateEmail,
  validatePassword,
  validateNomComplet,
  validateCguAcceptation,
  validateRegistrationPayload,
} from '@/lib/auth/validation';

// --- validateEmail ---

describe('validateEmail', () => {
  it('retourne null pour un email valide', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('retourne erreur si vide', () => {
    expect(validateEmail('')).toBe('Email requis.');
  });

  it('retourne erreur si non-string', () => {
    expect(validateEmail(123)).toBe('Email requis.');
    expect(validateEmail(null)).toBe('Email requis.');
  });

  it('retourne erreur si format invalide', () => {
    expect(validateEmail('invalid')).toBe('Format email invalide.');
    expect(validateEmail('no@domain')).toBe('Format email invalide.');
  });

  it('trim les espaces', () => {
    expect(validateEmail('  user@example.com  ')).toBeNull();
  });
});

// --- validatePassword ---

describe('validatePassword', () => {
  it('retourne null pour un mot de passe valide', () => {
    expect(validatePassword('Abcdef1!')).toBeNull();
  });

  it('retourne erreur si vide', () => {
    expect(validatePassword('')).toBe('Mot de passe requis.');
  });

  it('retourne erreur si trop court', () => {
    expect(validatePassword('Ab1')).toContain('au moins 8');
  });

  it('retourne erreur si pas de majuscule', () => {
    expect(validatePassword('abcdefg1')).toContain('majuscule');
  });

  it('retourne erreur si pas de minuscule', () => {
    expect(validatePassword('ABCDEFG1')).toContain('minuscule');
  });

  it('retourne erreur si pas de chiffre', () => {
    expect(validatePassword('Abcdefgh')).toContain('chiffre');
  });
});

// --- validateNomComplet ---

describe('validateNomComplet', () => {
  it('retourne null pour un nom valide', () => {
    expect(validateNomComplet('Jean Dupont')).toBeNull();
  });

  it('retourne erreur si vide', () => {
    expect(validateNomComplet('')).toBe('Nom complet requis.');
  });

  it('retourne erreur si trop long', () => {
    const longName = 'a'.repeat(201);
    expect(validateNomComplet(longName)).toContain('200');
  });
});

// --- validateCguAcceptation ---

describe('validateCguAcceptation', () => {
  it('retourne null si accepté', () => {
    expect(validateCguAcceptation(true)).toBeNull();
  });

  it('retourne erreur si false', () => {
    expect(validateCguAcceptation(false)).toContain('conditions');
  });

  it('retourne erreur si absent', () => {
    expect(validateCguAcceptation(undefined)).toContain('conditions');
  });
});

// --- validateRegistrationPayload ---

describe('validateRegistrationPayload', () => {
  const validPayload = {
    email: 'marc@example.com',
    mot_de_passe: 'Secure1pwd',
    mot_de_passe_confirmation: 'Secure1pwd',
    nom_complet: 'Marc Dupont',
    cgu_acceptee: true,
  };

  it('retourne data pour un payload valide', () => {
    const result = validateRegistrationPayload(validPayload);
    expect('data' in result).toBe(true);

    if ('data' in result) {
      expect(result.data.email).toBe('marc@example.com');
      expect(result.data.nomComplet).toBe('Marc Dupont');
      expect(result.data.cguAcceptee).toBe(true);
    }
  });

  it('retourne erreurs si payload vide', () => {
    const result = validateRegistrationPayload({});
    expect('errors' in result).toBe(true);

    if ('errors' in result) {
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('retourne erreur si mots de passe ne correspondent pas', () => {
    const result = validateRegistrationPayload({
      ...validPayload,
      mot_de_passe_confirmation: 'Different1pwd',
    });

    expect('errors' in result).toBe(true);

    if ('errors' in result) {
      expect(result.errors).toContain(
        'Les mots de passe ne correspondent pas.',
      );
    }
  });

  it('retourne erreur pour payload null', () => {
    const result = validateRegistrationPayload(null);
    expect('errors' in result).toBe(true);
  });

  it('ne vérifie pas la confirmation si le mot de passe est déjà invalide', () => {
    const result = validateRegistrationPayload({
      ...validPayload,
      mot_de_passe: 'weak',
      mot_de_passe_confirmation: 'different',
    });

    if ('errors' in result) {
      expect(
        result.errors.some((e) => e.includes('ne correspondent pas')),
      ).toBe(false);
    }
  });
});
