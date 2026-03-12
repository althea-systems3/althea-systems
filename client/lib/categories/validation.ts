import {
  NOM_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  SLUG_PATTERN,
  CATEGORIES_STORAGE_PATH,
} from '@/lib/categories/constants';

export function validateNom(nom: unknown): string | null {
  if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
    return 'Le nom est obligatoire.';
  }

  if (nom.length > NOM_MAX_LENGTH) {
    return `Le nom ne doit pas dépasser ${NOM_MAX_LENGTH} caractères.`;
  }

  return null;
}

export function validateDescription(description: unknown): string | null {
  if (!description) {
    return null;
  }

  if (typeof description !== 'string') {
    return 'La description doit être une chaîne de caractères.';
  }

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return `La description ne doit pas dépasser ${DESCRIPTION_MAX_LENGTH} caractères.`;
  }

  return null;
}

export function validateSlug(slug: unknown): string | null {
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    return 'Le slug est obligatoire.';
  }

  if (!SLUG_PATTERN.test(slug)) {
    return 'Le slug doit être en format kebab-case (ex: mon-slug).';
  }

  return null;
}

export function generateSecureFileName(
  originalName: string,
  categoryId: string,
): string {
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
  const parts = sanitizedName.split('.');
  const hasExtension = parts.length > 1;
  const extension = hasExtension ? parts.pop() : 'bin';
  const timestamp = Date.now();

  return `${CATEGORIES_STORAGE_PATH}/${categoryId}/${timestamp}.${extension}`;
}
