import { describe, expect, it } from 'vitest';

import {
  validateNom,
  validateDescription,
  validateSlug,
  generateSecureFileName,
} from '@/lib/categories/validation';

import {
  NOM_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
} from '@/lib/categories/constants';

// --- validateNom ---

describe('validateNom', () => {
  it('retourne une erreur si le nom est vide', () => {
    expect(validateNom('')).toContain('obligatoire');
  });

  it('retourne une erreur si le nom est null', () => {
    expect(validateNom(null)).toContain('obligatoire');
  });

  it('retourne une erreur si le nom est undefined', () => {
    expect(validateNom(undefined)).toContain('obligatoire');
  });

  it('retourne une erreur si le nom dépasse la limite', () => {
    const longNom = 'a'.repeat(NOM_MAX_LENGTH + 1);
    expect(validateNom(longNom)).toContain('dépasser');
  });

  it('retourne null pour un nom valide', () => {
    expect(validateNom('Bijoux')).toBeNull();
  });

  it('retourne null pour un nom à la limite exacte', () => {
    const nomExact = 'a'.repeat(NOM_MAX_LENGTH);
    expect(validateNom(nomExact)).toBeNull();
  });
});

// --- validateDescription ---

describe('validateDescription', () => {
  it('retourne null si la description est null', () => {
    expect(validateDescription(null)).toBeNull();
  });

  it('retourne null si la description est undefined', () => {
    expect(validateDescription(undefined)).toBeNull();
  });

  it('retourne une erreur si la description n est pas une string', () => {
    expect(validateDescription(123)).toContain('chaîne');
  });

  it('retourne une erreur si la description dépasse la limite', () => {
    const longDescription = 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1);
    expect(validateDescription(longDescription)).toContain('dépasser');
  });

  it('retourne null pour une description valide', () => {
    expect(validateDescription('Belle catégorie')).toBeNull();
  });
});

// --- validateSlug ---

describe('validateSlug', () => {
  it('retourne une erreur si le slug est vide', () => {
    expect(validateSlug('')).toContain('obligatoire');
  });

  it('retourne une erreur si le slug est null', () => {
    expect(validateSlug(null)).toContain('obligatoire');
  });

  it('retourne une erreur si le slug contient des majuscules', () => {
    expect(validateSlug('Mon-Slug')).toContain('kebab-case');
  });

  it('retourne une erreur si le slug contient des espaces', () => {
    expect(validateSlug('mon slug')).toContain('kebab-case');
  });

  it('retourne une erreur si le slug commence par un tiret', () => {
    expect(validateSlug('-mon-slug')).toContain('kebab-case');
  });

  it('retourne une erreur si le slug finit par un tiret', () => {
    expect(validateSlug('mon-slug-')).toContain('kebab-case');
  });

  it('retourne null pour un slug valide simple', () => {
    expect(validateSlug('bijoux')).toBeNull();
  });

  it('retourne null pour un slug valide avec tirets', () => {
    expect(validateSlug('bijoux-fantaisie')).toBeNull();
  });

  it('retourne null pour un slug valide avec chiffres', () => {
    expect(validateSlug('collection-2024')).toBeNull();
  });
});

// --- generateSecureFileName ---

describe('generateSecureFileName', () => {
  it('génère un chemin avec le dossier categories et l id', () => {
    const fileName = generateSecureFileName('photo.jpg', 'cat-1');
    expect(fileName).toMatch(/^categories\/cat-1\//);
  });

  it('génère un chemin avec l extension du fichier original', () => {
    const fileName = generateSecureFileName('image.webp', 'cat-1');
    expect(fileName).toMatch(/\.webp$/);
  });

  it('sanitise les caractères spéciaux du nom original', () => {
    const fileName = generateSecureFileName('ma photo (1).png', 'cat-1');
    expect(fileName).toMatch(/\.png$/);
    expect(fileName).not.toContain(' ');
    expect(fileName).not.toContain('(');
  });

  it('utilise bin comme extension par défaut si absente', () => {
    const fileName = generateSecureFileName('fichier', 'cat-1');
    expect(fileName).toMatch(/\.bin$/);
  });
});
