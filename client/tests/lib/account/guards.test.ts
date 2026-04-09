import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => null,
      set: vi.fn(),
      delete: vi.fn(),
      getAll: () => [],
    }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

// --- Import après mocks ---

import { requireAuthenticatedUser } from '@/lib/account/guards';

// --- Tests ---

describe('requireAuthenticatedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne userId si utilisateur authentifié', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    const result = await requireAuthenticatedUser();

    expect(result.userId).toBe('user-001');
    expect(result.response).toBeNull();
  });

  it('retourne 401 si aucun utilisateur', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });

    const result = await requireAuthenticatedUser();

    expect(result.userId).toBeNull();
    expect(result.response).not.toBeNull();
    expect(result.response!.status).toBe(401);

    const body = await result.response!.json();
    expect(body.code).toBe('session_expired');
  });

  it('retourne 401 si erreur auth', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'jwt expired' },
    });

    const result = await requireAuthenticatedUser();

    expect(result.userId).toBeNull();
    expect(result.response!.status).toBe(401);
  });
});
