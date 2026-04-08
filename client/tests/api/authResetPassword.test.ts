import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockSelectSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateUserById = vi.fn();
const mockIsRateLimited = vi.fn();
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
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSelectSingle(),
        }),
      }),
      update: (data: unknown) => ({
        eq: () => mockUpdate(data),
      }),
    }),
    auth: {
      admin: {
        updateUserById: (id: string, data: unknown) =>
          mockUpdateUserById(id, data),
      },
    },
  }),
}));

vi.mock('@/lib/auth/csrf', () => ({
  verifyCsrf: () => null,
}));

vi.mock('@/lib/auth/rateLimiter', () => ({
  resetPasswordRateLimiter: {
    isRateLimited: (key: string) => mockIsRateLimited(key),
  },
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/auth/logAuthActivity', () => ({
  logAuthActivity: (action: string, details: unknown) =>
    mockLogAuthActivity(action, details),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/auth/reset-password/route';

// --- Helpers ---

function createRequest(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/auth/reset-password',
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

const VALID_PAYLOAD = {
  token: 'valid-reset-token',
  mot_de_passe: 'NewSecure1pwd',
  mot_de_passe_confirmation: 'NewSecure1pwd',
};

// --- Tests ---

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockReturnValue(false);
    mockUpdate.mockResolvedValue({ error: null });
    mockUpdateUserById.mockResolvedValue({ error: null });
    mockLogAuthActivity.mockResolvedValue(undefined);
  });

  it('retourne 429 si rate limited', async () => {
    mockIsRateLimited.mockReturnValue(true);

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(429);
  });

  it('retourne 400 si token manquant', async () => {
    const response = await POST(
      createRequest({ ...VALID_PAYLOAD, token: '' }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Lien invalide ou expiré.');
  });

  it('retourne 400 si mot de passe invalide', async () => {
    const response = await POST(
      createRequest({ ...VALID_PAYLOAD, mot_de_passe: 'weak', mot_de_passe_confirmation: 'weak' }),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 400 si confirmation ne correspond pas', async () => {
    const response = await POST(
      createRequest({
        ...VALID_PAYLOAD,
        mot_de_passe_confirmation: 'Different1pwd',
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Les mots de passe ne correspondent pas.');
  });

  it('retourne 400 si token introuvable en base', async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(400);
  });

  it('retourne 400 si token expiré', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@example.com',
        reset_token_expires_at: '2020-01-01T00:00:00Z',
      },
      error: null,
    });

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(400);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('retourne 200 et met à jour le mot de passe en cas de succès', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@example.com',
        reset_token_expires_at: '2099-12-31T00:00:00Z',
      },
      error: null,
    });

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Mot de passe réinitialisé avec succès.');
    expect(mockUpdateUserById).toHaveBeenCalledWith(
      'user-001',
      { password: 'NewSecure1pwd' },
    );
  });

  it('log auth.reset_password en cas de succès', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@example.com',
        reset_token_expires_at: '2099-12-31T00:00:00Z',
      },
      error: null,
    });

    await POST(createRequest(VALID_PAYLOAD));

    await vi.waitFor(() => {
      expect(mockLogAuthActivity).toHaveBeenCalledWith(
        'auth.reset_password',
        expect.objectContaining({ userId: 'user-001' }),
      );
    });
  });
});
