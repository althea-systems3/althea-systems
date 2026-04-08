import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockSelectSingle = vi.fn();
const mockUpdateEq = vi.fn();
const mockSendVerificationEmail = vi.fn();
const mockLogAuthActivity = vi.fn();
const mockIsRateLimited = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSelectSingle(),
        }),
      }),
      update: () => ({
        eq: () => mockUpdateEq(),
      }),
    }),
  }),
}));

vi.mock('@/lib/auth/csrf', () => ({
  verifyCsrf: () => null,
}));

vi.mock('@/lib/auth/rateLimiter', () => ({
  resendRateLimiter: {
    isRateLimited: (key: string) => mockIsRateLimited(key),
  },
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/auth/email', () => ({
  sendVerificationEmail: (data: unknown) => mockSendVerificationEmail(data),
}));

vi.mock('@/lib/auth/logAuthActivity', () => ({
  logAuthActivity: (action: string, details: unknown) =>
    mockLogAuthActivity(action, details),
}));

vi.mock('@/lib/auth/token', () => ({
  generateVerificationToken: () => ({
    rawToken: 'raw-resend-token',
    tokenHash: 'hashed-resend-token',
  }),
  computeTokenExpiry: () => new Date('2026-04-09T12:00:00.000Z'),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/auth/resend-verification/route';

// --- Helpers ---

function createRequest(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/auth/resend-verification',
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

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockReturnValue(false);
    mockUpdateEq.mockResolvedValue({ error: null });
    mockSendVerificationEmail.mockResolvedValue(undefined);
    mockLogAuthActivity.mockResolvedValue(undefined);
  });

  it('retourne 429 si rate limited', async () => {
    mockIsRateLimited.mockReturnValue(true);

    const response = await POST(
      createRequest({ email: 'user@test.com' }),
    );

    expect(response.status).toBe(429);
  });

  it('retourne 400 si email invalide', async () => {
    const response = await POST(createRequest({ email: 'invalid' }));

    expect(response.status).toBe(400);
  });

  it('retourne 200 générique si email introuvable (anti-énumération)', async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await POST(
      createRequest({ email: 'unknown@test.com' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('lien de vérification');
  });

  it('retourne 200 générique si déjà vérifié', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@test.com',
        nom_complet: 'Jean',
        email_verifie: true,
      },
      error: null,
    });

    const response = await POST(
      createRequest({ email: 'user@test.com' }),
    );

    expect(response.status).toBe(200);
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it('envoie un nouvel email pour un utilisateur non vérifié', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@test.com',
        nom_complet: 'Jean Dupont',
        email_verifie: false,
      },
      error: null,
    });

    const response = await POST(
      createRequest({ email: 'user@test.com' }),
    );

    expect(response.status).toBe(200);

    await vi.waitFor(() => {
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'user@test.com',
          customerName: 'Jean Dupont',
        }),
      );
    });
  });

  it('appelle logAuthActivity avec auth.resend_verification', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@test.com',
        nom_complet: 'Jean',
        email_verifie: false,
      },
      error: null,
    });

    await POST(createRequest({ email: 'user@test.com' }));

    await vi.waitFor(() => {
      expect(mockLogAuthActivity).toHaveBeenCalledWith(
        'auth.resend_verification',
        expect.objectContaining({ userId: 'user-001' }),
      );
    });
  });
});
