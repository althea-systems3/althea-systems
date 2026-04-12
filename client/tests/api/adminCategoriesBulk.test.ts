import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockUpdateQuery = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/firebase/logActivity', () => ({
  logAdminActivity: (...args: unknown[]) => mockLogAdminActivity(...args),
}));

function createChainableQuery(resolveFn: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.eq = self;
  chain.in = self;
  chain.select = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => {
    return Promise.resolve(resolveFn()).then(resolve);
  };

  return chain;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: () => createChainableQuery(() => mockUpdateQuery()),
    }),
  }),
}));

vi.mock('@/lib/admin/common', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual };
});

import { POST } from '@/app/api/admin/categories/bulk/route';

// --- Helpers ---

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/categories/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Tests ---

describe('POST /api/admin/categories/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockUpdateQuery.mockReturnValue({ error: null });
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await POST(
      createPostRequest({
        action: 'activate',
        categoryIds: ['cat-1'],
      }),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si action invalide', async () => {
    const response = await POST(
      createPostRequest({
        action: 'invalid',
        categoryIds: ['cat-1'],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('invalide');
  });

  it('retourne 400 si aucun id fourni', async () => {
    const response = await POST(
      createPostRequest({ action: 'activate', categoryIds: [] }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Aucune');
  });

  it('active les catégories avec succès', async () => {
    const response = await POST(
      createPostRequest({
        action: 'activate',
        categoryIds: ['cat-1', 'cat-2'],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.action).toBe('activate');
    expect(body.affectedCount).toBe(2);
  });

  it('désactive les catégories avec succès', async () => {
    const response = await POST(
      createPostRequest({
        action: 'deactivate',
        categoryIds: ['cat-1'],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('deactivate');
    expect(body.affectedCount).toBe(1);
  });

  it('log l activité bulk avec le statut', async () => {
    await POST(
      createPostRequest({
        action: 'activate',
        categoryIds: ['cat-1', 'cat-2'],
      }),
    );

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'categories.bulk_status',
      expect.objectContaining({
        categoryIds: ['cat-1', 'cat-2'],
        statut: 'active',
      }),
    );
  });

  it('retourne 500 si erreur base de données', async () => {
    mockUpdateQuery.mockReturnValue({
      error: { message: 'connection failed' },
    });

    const response = await POST(
      createPostRequest({
        action: 'activate',
        categoryIds: ['cat-1'],
      }),
    );

    expect(response.status).toBe(500);
  });
});
