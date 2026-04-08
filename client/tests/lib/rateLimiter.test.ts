import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createRateLimiter } from '@/lib/auth/rateLimiter';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('autorise les requêtes sous la limite', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 });

    expect(limiter.isRateLimited('ip-1')).toBe(false);
    expect(limiter.isRateLimited('ip-1')).toBe(false);
    expect(limiter.isRateLimited('ip-1')).toBe(false);
  });

  it('bloque les requêtes au-dessus de la limite', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });

    expect(limiter.isRateLimited('ip-1')).toBe(false);
    expect(limiter.isRateLimited('ip-1')).toBe(false);
    expect(limiter.isRateLimited('ip-1')).toBe(true);
  });

  it('isole les clés différentes', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 });

    expect(limiter.isRateLimited('ip-1')).toBe(false);
    expect(limiter.isRateLimited('ip-2')).toBe(false);
    expect(limiter.isRateLimited('ip-1')).toBe(true);
  });

  it('réinitialise après la fenêtre de temps', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 });

    expect(limiter.isRateLimited('ip-1')).toBe(false);
    expect(limiter.isRateLimited('ip-1')).toBe(true);

    vi.advanceTimersByTime(60001);

    expect(limiter.isRateLimited('ip-1')).toBe(false);
  });
});
