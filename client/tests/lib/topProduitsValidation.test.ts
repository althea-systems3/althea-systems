import { describe, expect, it } from 'vitest';

import {
  validateIdProduit,
  validatePriorite,
} from '@/lib/top-produits/validation';

// --- validateIdProduit ---

describe('validateIdProduit', () => {
  it('retourne une erreur si l identifiant est vide', () => {
    expect(validateIdProduit('')).toContain('obligatoire');
  });

  it('retourne une erreur si l identifiant est null', () => {
    expect(validateIdProduit(null)).toContain('obligatoire');
  });

  it('retourne une erreur si l identifiant est undefined', () => {
    expect(validateIdProduit(undefined)).toContain('obligatoire');
  });

  it('retourne une erreur si l identifiant n est pas une string', () => {
    expect(validateIdProduit(123)).toContain('obligatoire');
  });

  it('retourne une erreur si l identifiant est un espace vide', () => {
    expect(validateIdProduit('   ')).toContain('obligatoire');
  });

  it('retourne null pour un identifiant valide', () => {
    expect(validateIdProduit('prod-1')).toBeNull();
  });
});

// --- validatePriorite ---

describe('validatePriorite', () => {
  it('retourne null si la priorité est undefined', () => {
    expect(validatePriorite(undefined)).toBeNull();
  });

  it('retourne null si la priorité est null', () => {
    expect(validatePriorite(null)).toBeNull();
  });

  it('retourne une erreur si la priorité est zéro', () => {
    expect(validatePriorite(0)).toContain('entier positif');
  });

  it('retourne une erreur si la priorité est négative', () => {
    expect(validatePriorite(-1)).toContain('entier positif');
  });

  it('retourne une erreur si la priorité est un décimal', () => {
    expect(validatePriorite(1.5)).toContain('entier positif');
  });

  it('retourne une erreur si la priorité est une string', () => {
    expect(validatePriorite('abc')).toContain('entier positif');
  });

  it('retourne null pour une priorité valide', () => {
    expect(validatePriorite(1)).toBeNull();
  });

  it('retourne null pour une grande priorité valide', () => {
    expect(validatePriorite(100)).toBeNull();
  });
});
