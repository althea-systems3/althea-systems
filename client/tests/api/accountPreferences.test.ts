import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockUpdateEq = vi.fn();
const mockLogAuthActivity = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: () => ({ name: 'remember_me', value: '1' }),
    }),
  ),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: () => ({
        eq: mockUpdateEq,
      }),
    }),
  }),
}));

vi.mock('@/lib/auth/logAuthActivity', () => ({
  logAuthActivity: (...args: unknown[]) => mockLogAuthActivity(...args),
}));

import { PATCH } from '@/app/api/account/preferences/route';

// --- Helpers ---

function createPatchRequest(body?: unknown): Request {
  const init: RequestInit = { method: 'PATCH' };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new Request('http://localhost/api/account/preferences', init);
}

// --- Tests ---

describe('PATCH /api/account/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockLogAuthActivity.mockResolvedValue(undefined);
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });

    const response = await PATCH(createPatchRequest({ langue_preferee: 'en' }));

    expect(response.status).toBe(401);
  });

  it('retourne 400 si body manquant', async () => {
    const request = new Request('http://localhost/api/account/preferences', {
      method: 'PATCH',
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });

  it('retourne 400 si langue_preferee absente', async () => {
    const response = await PATCH(createPatchRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('langue_required');
  });

  it('retourne 400 si langue non supportée', async () => {
    const response = await PATCH(
      createPatchRequest({ langue_preferee: 'de' }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('langue_invalide');
  });

  it('met à jour avec succès et retourne dir', async () => {
    const response = await PATCH(
      createPatchRequest({ langue_preferee: 'ar' }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('preferences_updated');
    expect(body.langue_preferee).toBe('ar');
    expect(body.dir).toBe('rtl');
  });

  it('log le changement de langue', async () => {
    await PATCH(createPatchRequest({ langue_preferee: 'en' }));

    expect(mockLogAuthActivity).toHaveBeenCalledWith(
      'account.langue_updated',
      expect.objectContaining({
        userId: 'user-1',
        langue: 'en',
      }),
    );
  });

  it('retourne 500 si erreur base de données', async () => {
    mockUpdateEq.mockResolvedValue({
      error: { message: 'connection failed' },
    });

    const response = await PATCH(
      createPatchRequest({ langue_preferee: 'en' }),
    );

    expect(response.status).toBe(500);
  });
});
