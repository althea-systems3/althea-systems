import { NextRequest } from 'next/server';

import {
  RATE_LIMIT_REGISTER_MAX,
  RATE_LIMIT_REGISTER_WINDOW_MS,
  RATE_LIMIT_RESEND_MAX,
  RATE_LIMIT_RESEND_WINDOW_MS,
} from '@/lib/auth/constants';

// --- Types ---

type RateLimiterConfig = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimiter = {
  isRateLimited: (key: string) => boolean;
};

// --- Factory ---

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const entries = new Map<string, RateLimitEntry>();

  return {
    isRateLimited(key: string): boolean {
      const now = Date.now();
      const existing = entries.get(key);

      if (!existing || now >= existing.resetAt) {
        entries.set(key, { count: 1, resetAt: now + config.windowMs });
        return false;
      }

      existing.count += 1;

      return existing.count > config.maxRequests;
    },
  };
}

// --- Extraction IP ---

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

// --- Instances pré-configurées ---

export const registerRateLimiter = createRateLimiter({
  maxRequests: RATE_LIMIT_REGISTER_MAX,
  windowMs: RATE_LIMIT_REGISTER_WINDOW_MS,
});

export const resendRateLimiter = createRateLimiter({
  maxRequests: RATE_LIMIT_RESEND_MAX,
  windowMs: RATE_LIMIT_RESEND_WINDOW_MS,
});
