import { describe, expect, it } from 'vitest';

import {
  levenshteinDistance,
  computeTextRelevanceScore,
  computeProductRelevanceScore,
} from '@/lib/search/scoring';

// --- levenshteinDistance ---

describe('levenshteinDistance', () => {
  it('retourne 0 pour deux chaînes identiques', () => {
    expect(levenshteinDistance('audio', 'audio')).toBe(0);
  });

  it('retourne 1 pour une substitution', () => {
    expect(levenshteinDistance('audio', 'audi0')).toBe(1);
  });

  it('retourne 1 pour un caractère ajouté', () => {
    expect(levenshteinDistance('audio', 'audios')).toBe(1);
  });

  it('retourne 1 pour un caractère supprimé', () => {
    expect(levenshteinDistance('audio', 'audi')).toBe(1);
  });

  it('retourne la longueur de la chaîne si comparée à une chaîne vide', () => {
    expect(levenshteinDistance('test', '')).toBe(4);
    expect(levenshteinDistance('', 'test')).toBe(4);
  });

  it('retourne la distance correcte pour des chaînes très différentes', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });
});

// --- computeTextRelevanceScore ---

describe('computeTextRelevanceScore', () => {
  it('retourne 400 pour une correspondance exacte', () => {
    expect(computeTextRelevanceScore('Interface Audio', 'interface audio')).toBe(400);
  });

  it('retourne 300 pour un caractère de différence sur le champ entier', () => {
    expect(computeTextRelevanceScore('audio', 'audi0')).toBe(300);
  });

  it('retourne 300 pour un mot proche dans le champ', () => {
    expect(computeTextRelevanceScore('Interface Audio DSP', 'audi0')).toBe(300);
  });

  it('retourne 200 si le champ commence par le terme', () => {
    expect(computeTextRelevanceScore('Interface Audio DSP-24', 'interface')).toBe(200);
  });

  it('retourne 100 si le champ contient le terme', () => {
    expect(computeTextRelevanceScore('Interface Audio DSP-24', 'dsp')).toBe(100);
  });

  it('retourne 100 si un mot du champ commence par le terme', () => {
    expect(computeTextRelevanceScore('Interface Audio DSP-24', 'aud')).toBe(100);
  });

  it('retourne 0 si aucune correspondance', () => {
    expect(computeTextRelevanceScore('Interface Audio', 'réseau')).toBe(0);
  });

  it('retourne 0 si le champ est null', () => {
    expect(computeTextRelevanceScore(null, 'audio')).toBe(0);
  });

  it('retourne 0 si le terme est vide', () => {
    expect(computeTextRelevanceScore('Interface Audio', '')).toBe(0);
  });
});

// --- computeProductRelevanceScore ---

describe('computeProductRelevanceScore', () => {
  it('donne un poids double au titre par rapport à la description', () => {
    // Arrange - "audio" exact match dans le titre (400*2) + pas dans la description (0*1)
    const productTitleMatch = {
      nom: 'audio',
      description: 'Produit de qualité professionnelle',
    };

    // "audio" exact match dans la description (400*1) + pas dans le titre (0*2)
    const productDescMatch = {
      nom: 'Produit professionnel',
      description: 'audio',
    };

    // Act
    const scoreTitleMatch = computeProductRelevanceScore(productTitleMatch, 'audio');
    const scoreDescMatch = computeProductRelevanceScore(productDescMatch, 'audio');

    // Assert
    expect(scoreTitleMatch).toBe(800); // 400*2 + 0*1
    expect(scoreDescMatch).toBe(400); // 0*2 + 400*1
    expect(scoreTitleMatch).toBeGreaterThan(scoreDescMatch);
  });

  it('combine les scores titre et description', () => {
    const product = {
      nom: 'Interface Audio DSP-24',
      description: 'Interface audio 24 canaux avec traitement DSP',
    };

    const score = computeProductRelevanceScore(product, 'audio');

    // Titre: "audio" est un mot contenu → 100. Description: "audio" est un mot contenu → 100
    // Score: 100*2 + 100*1 = 300
    expect(score).toBe(300);
  });

  it('retourne 0 si aucune correspondance dans titre ni description', () => {
    const product = {
      nom: 'Switch Industriel',
      description: 'Équipement réseau robuste',
    };

    const score = computeProductRelevanceScore(product, 'caméra');

    expect(score).toBe(0);
  });

  it('gère une description null', () => {
    const product = { nom: 'audio', description: null };

    const score = computeProductRelevanceScore(product, 'audio');

    // Titre exact: 400*2 + description null: 0*1
    expect(score).toBe(800);
  });
});
