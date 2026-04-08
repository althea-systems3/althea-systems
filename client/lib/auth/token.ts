import { createHash, randomUUID } from 'crypto';

import {
  VERIFICATION_TOKEN_EXPIRY_HOURS,
  RESET_TOKEN_EXPIRY_HOURS,
} from '@/lib/auth/constants';

// --- Constantes ---

const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';
const MS_PER_HOUR = 3600 * 1000;

// --- Fonctions ---

export function hashToken(rawToken: string): string {
  return createHash(HASH_ALGORITHM).update(rawToken).digest(HASH_ENCODING);
}

export function generateVerificationToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomUUID();
  const tokenHash = hashToken(rawToken);

  return { rawToken, tokenHash };
}

export function computeTokenExpiry(): Date {
  const expiryMs = VERIFICATION_TOKEN_EXPIRY_HOURS * MS_PER_HOUR;
  return new Date(Date.now() + expiryMs);
}

export function computeResetTokenExpiry(): Date {
  const expiryMs = RESET_TOKEN_EXPIRY_HOURS * MS_PER_HOUR;
  return new Date(Date.now() + expiryMs);
}

export function isTokenExpired(expiresAt: Date | string): boolean {
  const expiryDate =
    typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return Date.now() > expiryDate.getTime();
}
