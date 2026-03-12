import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/carousel/constants';

const DANGEROUS_URL_PREFIXES = ['javascript:', 'data:', 'vbscript:'];

export function isValidRedirectUrl(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false;
  }

  const lowerUrl = url.toLowerCase().trim();

  const hasDangerousPrefix = DANGEROUS_URL_PREFIXES.some(
    (prefix) => lowerUrl.startsWith(prefix),
  );

  if (hasDangerousPrefix) {
    return false;
  }

  // NOTE: Seules les URLs internes (commençant par /) sont autorisées
  return lowerUrl.startsWith('/');
}

export function isValidImageMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
}

export function isImageWithinSizeLimit(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_IMAGE_SIZE_BYTES;
}

const TITRE_MAX_LENGTH = 100;

export function validateTitre(titre: unknown): string | null {
  if (!titre || typeof titre !== 'string' || titre.trim().length === 0) {
    return 'Le titre est obligatoire.';
  }

  if (titre.length > TITRE_MAX_LENGTH) {
    return `Le titre ne doit pas dépasser ${TITRE_MAX_LENGTH} caractères.`;
  }

  return null;
}

export function validateLienRedirection(lien: unknown): string | null {
  if (!lien) {
    return null;
  }

  if (typeof lien !== 'string' || !isValidRedirectUrl(lien)) {
    return 'Le lien doit être une URL interne (commençant par /).';
  }

  return null;
}

export function generateSecureFileName(
  originalName: string,
  slideId: string,
  variant: 'desktop' | 'mobile',
): string {
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
  const extension = sanitizedName.split('.').pop() ?? 'bin';
  const timestamp = Date.now();

  return `carousel/${slideId}/${variant}-${timestamp}.${extension}`;
}
