import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockSelectSingle = vi.fn();
const mockUpdateEq = vi.fn();
const mockLogAuthActivity = vi.fn();

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

vi.mock('@/lib/auth/token', () => ({
  hashToken: (raw: string) => `hashed_${raw}`,
  isTokenExpired: (date: string) => new Date(date) < new Date(),
}));

vi.mock('@/lib/auth/logAuthActivity', () => ({
  logAuthActivity: (action: string, details: unknown) =>
    mockLogAuthActivity(action, details),
}));

// --- Import après mocks ---

import { GET } from '@/app/api/auth/verify-email/route';

// --- Helpers ---

function createRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost:3000/api/auth/verify-email?token=${token}`
    : 'http://localhost:3000/api/auth/verify-email';

  return new NextRequest(url);
}

// --- Tests ---

describe('GET /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
    mockLogAuthActivity.mockResolvedValue(undefined);
  });

  it('retourne 400 si token absent', async () => {
    const response = await GET(createRequest());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('invalide');
  });

  it('retourne 400 si token introuvable en base', async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await GET(createRequest('unknown-token'));

    expect(response.status).toBe(400);
  });

  it('retourne 400 si token expiré et nettoie la base', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@test.com',
        email_verifie: false,
        validation_token_expires_at: '2020-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const response = await GET(createRequest('expired-token'));

    expect(response.status).toBe(400);
    expect(mockUpdateEq).toHaveBeenCalled();
  });

  it('redirige vers /connexion?verified=already si déjà vérifié', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@test.com',
        email_verifie: true,
        validation_token_expires_at: null,
      },
      error: null,
    });

    const response = await GET(createRequest('valid-token'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('verified=already');
  });

  it('active le compte et redirige vers /connexion?verified=true', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@test.com',
        email_verifie: false,
        validation_token_expires_at: futureDate,
      },
      error: null,
    });

    const response = await GET(createRequest('valid-token'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('verified=true');
    expect(mockUpdateEq).toHaveBeenCalled();
  });

  it('appelle logAuthActivity avec auth.verify_email', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        email: 'user@test.com',
        email_verifie: false,
        validation_token_expires_at: futureDate,
      },
      error: null,
    });

    await GET(createRequest('valid-token'));

    await vi.waitFor(() => {
      expect(mockLogAuthActivity).toHaveBeenCalledWith(
        'auth.verify_email',
        expect.objectContaining({ userId: 'user-001' }),
      );
    });
  });
});
