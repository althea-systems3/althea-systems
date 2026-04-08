import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockCookieDelete = vi.fn();
const mockLogAuthActivity = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => null,
      set: vi.fn(),
      delete: mockCookieDelete,
      getAll: () => [],
    }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
    },
  }),
}));

vi.mock('@/lib/auth/csrf', () => ({
  verifyCsrf: () => null,
}));

vi.mock('@/lib/auth/logAuthActivity', () => ({
  logAuthActivity: (action: string, details: unknown) =>
    mockLogAuthActivity(action, details),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/auth/logout/route';

// --- Helpers ---

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    },
  });
}

// --- Tests ---

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    mockLogAuthActivity.mockResolvedValue(undefined);
  });

  it('retourne 200 et appelle signOut', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Déconnexion réussie.');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('supprime le cookie remember_me', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });

    await POST(createRequest());

    expect(mockCookieDelete).toHaveBeenCalledWith('remember_me');
  });

  it('log auth.logout si utilisateur connecté', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });

    await POST(createRequest());

    await vi.waitFor(() => {
      expect(mockLogAuthActivity).toHaveBeenCalledWith(
        'auth.logout',
        expect.objectContaining({ userId: 'user-001' }),
      );
    });
  });

  it('ne log pas si aucun utilisateur connecté', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockLogAuthActivity).not.toHaveBeenCalled();
  });
});
