import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  hashToken,
  generateVerificationToken,
  computeTokenExpiry,
  isTokenExpired,
} from '@/lib/auth/token';

describe('hashToken', () => {
  it('retourne un hash SHA-256 hex', () => {
    const hash = hashToken('test-token');

    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it('est déterministe', () => {
    const hash1 = hashToken('same-token');
    const hash2 = hashToken('same-token');

    expect(hash1).toBe(hash2);
  });

  it('produit des hashs différents pour des tokens différents', () => {
    const hash1 = hashToken('token-a');
    const hash2 = hashToken('token-b');

    expect(hash1).not.toBe(hash2);
  });
});

describe('generateVerificationToken', () => {
  it('retourne un rawToken et un tokenHash différents', () => {
    const { rawToken, tokenHash } = generateVerificationToken();

    expect(rawToken).toBeTruthy();
    expect(tokenHash).toBeTruthy();
    expect(rawToken).not.toBe(tokenHash);
  });

  it('le tokenHash correspond au hash du rawToken', () => {
    const { rawToken, tokenHash } = generateVerificationToken();

    expect(hashToken(rawToken)).toBe(tokenHash);
  });

  it('génère des tokens uniques', () => {
    const token1 = generateVerificationToken();
    const token2 = generateVerificationToken();

    expect(token1.rawToken).not.toBe(token2.rawToken);
  });
});

describe('computeTokenExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retourne une date 24h dans le futur', () => {
    const expiry = computeTokenExpiry();
    const expected = new Date('2026-04-09T12:00:00.000Z');

    expect(expiry.getTime()).toBe(expected.getTime());
  });
});

describe('isTokenExpired', () => {
  it('retourne true pour une date passée', () => {
    const pastDate = new Date(Date.now() - 1000);

    expect(isTokenExpired(pastDate)).toBe(true);
  });

  it('retourne false pour une date future', () => {
    const futureDate = new Date(Date.now() + 60000);

    expect(isTokenExpired(futureDate)).toBe(false);
  });

  it('accepte une string ISO', () => {
    const pastString = new Date(Date.now() - 1000).toISOString();

    expect(isTokenExpired(pastString)).toBe(true);
  });
});
