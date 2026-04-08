import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockSelectSingle = vi.fn();
const mockLogAuthActivity = vi.fn();
const mockIsRateLimited = vi.fn();
const mockCookieSet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => null,
      set: mockCookieSet,
      delete: vi.fn(),
      getAll: () => [],
    }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      signInWithPassword: (params: unknown) => mockSignIn(params),
      signOut: () => mockSignOut(),
    },
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
    }),
  }),
}));

vi.mock('@/lib/auth/csrf', () => ({
  verifyCsrf: () => null,
}));

vi.mock('@/lib/auth/rateLimiter', () => ({
  loginRateLimiter: {
    isRateLimited: (key: string) => mockIsRateLimited(key),
  },
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/auth/logAuthActivity', () => ({
  logAuthActivity: (action: string, details: unknown) =>
    mockLogAuthActivity(action, details),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/auth/login/route';

// --- Helpers ---

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

const VALID_PAYLOAD = {
  email: 'user@example.com',
  mot_de_passe: 'Secure1pwd',
  se_souvenir: false,
};

// --- Tests ---

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockReturnValue(false);
    mockSignOut.mockResolvedValue({ error: null });
    mockLogAuthActivity.mockResolvedValue(undefined);
  });

  it('retourne 429 si rate limited', async () => {
    mockIsRateLimited.mockReturnValue(true);

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(429);
  });

  it('retourne 400 si email manquant', async () => {
    const response = await POST(
      createRequest({ ...VALID_PAYLOAD, email: '' }),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 400 si mot de passe manquant', async () => {
    const response = await POST(
      createRequest({ ...VALID_PAYLOAD, mot_de_passe: '' }),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 401 si identifiants incorrects', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Email ou mot de passe incorrect.');
  });

  it('retourne 403 avec code EMAIL_NOT_VERIFIED si email non vérifié', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@example.com' } },
      error: null,
    });

    mockSelectSingle.mockResolvedValue({
      data: {
        nom_complet: 'Jean',
        est_admin: false,
        statut: 'en_attente',
        email_verifie: false,
      },
      error: null,
    });

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('retourne 403 si compte inactif', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@example.com' } },
      error: null,
    });

    mockSelectSingle.mockResolvedValue({
      data: {
        nom_complet: 'Jean',
        est_admin: false,
        statut: 'inactif',
        email_verifie: true,
      },
      error: null,
    });

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(403);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('retourne 200 avec user data en cas de succès', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@example.com' } },
      error: null,
    });

    mockSelectSingle.mockResolvedValue({
      data: {
        nom_complet: 'Jean Dupont',
        est_admin: false,
        statut: 'actif',
        email_verifie: true,
      },
      error: null,
    });

    const response = await POST(createRequest(VALID_PAYLOAD));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.nomComplet).toBe('Jean Dupont');
    expect(body.message).toBe('Connexion réussie.');
  });

  it('set le cookie remember_me si se_souvenir est true', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@example.com' } },
      error: null,
    });

    mockSelectSingle.mockResolvedValue({
      data: {
        nom_complet: 'Jean',
        est_admin: false,
        statut: 'actif',
        email_verifie: true,
      },
      error: null,
    });

    await POST(
      createRequest({ ...VALID_PAYLOAD, se_souvenir: true }),
    );

    expect(mockCookieSet).toHaveBeenCalledWith(
      'remember_me',
      '1',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('ne set pas le cookie remember_me si se_souvenir est false', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@example.com' } },
      error: null,
    });

    mockSelectSingle.mockResolvedValue({
      data: {
        nom_complet: 'Jean',
        est_admin: false,
        statut: 'actif',
        email_verifie: true,
      },
      error: null,
    });

    await POST(createRequest(VALID_PAYLOAD));

    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('log auth.login_failed sur identifiants incorrects', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    await POST(createRequest(VALID_PAYLOAD));

    await vi.waitFor(() => {
      expect(mockLogAuthActivity).toHaveBeenCalledWith(
        'auth.login_failed',
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });
  });

  it('log auth.login_success en cas de succès', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@example.com' } },
      error: null,
    });

    mockSelectSingle.mockResolvedValue({
      data: {
        nom_complet: 'Jean',
        est_admin: false,
        statut: 'actif',
        email_verifie: true,
      },
      error: null,
    });

    await POST(createRequest(VALID_PAYLOAD));

    await vi.waitFor(() => {
      expect(mockLogAuthActivity).toHaveBeenCalledWith(
        'auth.login_success',
        expect.objectContaining({ userId: 'user-001' }),
      );
    });
  });
});
