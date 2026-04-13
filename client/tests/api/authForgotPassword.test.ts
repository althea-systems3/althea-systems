import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockUserSelectSingle = vi.fn();
const mockTokenUpdate = vi.fn();
const mockTokenInsert = vi.fn();
const mockIsRateLimited = vi.fn();
const mockSendResetEmail = vi.fn();
const mockLogAuthActivity = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => null,
      set: vi.fn(),
      delete: vi.fn(),
      getAll: () => [],
    }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'password_reset_token') {
        return {
          update: (data: unknown) => ({
            eq: () => ({
              eq: () => mockTokenUpdate(data),
            }),
          }),
          insert: (data: unknown) => mockTokenInsert(data),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            single: () => mockUserSelectSingle(),
          }),
        }),
      };
    },
  }),
}));

vi.mock('@/lib/auth/csrf', () => ({
  verifyCsrf: () => null,
}));

vi.mock('@/lib/auth/rateLimiter', () => ({
  forgotPasswordRateLimiter: {
    isRateLimited: (key: string) => mockIsRateLimited(key),
  },
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/auth/email', () => ({
  sendPasswordResetEmail: (data: unknown) => mockSendResetEmail(data),
}));

vi.mock('@/lib/auth/logAuthActivity', () => ({
  logAuthActivity: (action: string, details: unknown) =>
    mockLogAuthActivity(action, details),
}));

vi.mock('@/lib/auth/token', () => ({
  generateVerificationToken: () => ({
    rawToken: 'raw-token-123',
    tokenHash: 'hashed-token-123',
  }),
  computeResetTokenExpiry: () => new Date('2026-12-31T00:00:00Z'),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/auth/forgot-password/route';

// --- Helpers ---

function createRequest(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/auth/forgot-password',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      body: JSON.stringify(body),
    },
  );
}

// --- Tests ---

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockReturnValue(false);
    mockTokenUpdate.mockResolvedValue({ error: null });
    mockTokenInsert.mockResolvedValue({ error: null });
    mockSendResetEmail.mockResolvedValue(undefined);
    mockLogAuthActivity.mockResolvedValue(undefined);
  });

  it('retourne 429 si rate limited', async () => {
    mockIsRateLimited.mockReturnValue(true);

    const response = await POST(
      createRequest({ email: 'user@example.com' }),
    );

    expect(response.status).toBe(429);
  });

  it('retourne 400 si email manquant', async () => {
    const response = await POST(createRequest({ email: '' }));

    expect(response.status).toBe(400);
  });

  it('retourne 200 anti-énumération si utilisateur non trouvé', async () => {
    mockUserSelectSingle.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await POST(
      createRequest({ email: 'inconnu@example.com' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('lien de réinitialisation');
  });

  it('retourne 200 et envoie l\'email si utilisateur trouvé', async () => {
    mockUserSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        nom_complet: 'Jean Dupont',
      },
      error: null,
    });

    const response = await POST(
      createRequest({ email: 'jean@example.com' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('lien de réinitialisation');
    expect(mockSendResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'jean@example.com',
        customerName: 'Jean Dupont',
      }),
    );
  });

  it('log auth.forgot_password si utilisateur trouvé', async () => {
    mockUserSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        nom_complet: 'Jean Dupont',
      },
      error: null,
    });

    await POST(createRequest({ email: 'jean@example.com' }));

    await vi.waitFor(() => {
      expect(mockLogAuthActivity).toHaveBeenCalledWith(
        'auth.forgot_password',
        expect.objectContaining({ userId: 'user-001' }),
      );
    });
  });
});
