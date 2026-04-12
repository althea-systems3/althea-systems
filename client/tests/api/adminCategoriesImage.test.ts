import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockDeleteCategoryImages = vi.fn();

const mockCategoryExistsQuery = vi.fn();
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

vi.mock('@/lib/admin/categoryImages', () => ({
  deleteCategoryImages: (...args: unknown[]) =>
    mockDeleteCategoryImages(...args),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getStorageClient: () => ({
    bucket: () => ({
      getFiles: () => Promise.resolve([[]]),
    }),
  }),
}));

function createChainableQuery(resolveFn: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.eq = self;
  chain.in = self;
  chain.select = () => chain;
  chain.single = resolveFn;
  chain.then = (resolve: (v: unknown) => unknown) => {
    return Promise.resolve(resolveFn()).then(resolve);
  };

  return chain;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => createChainableQuery(() => mockCategoryExistsQuery()),
      update: () => createChainableQuery(() => mockUpdateQuery()),
    }),
  }),
}));

vi.mock('@/lib/categories/constants', () => ({
  CATEGORIES_STORAGE_PATH: 'categories',
}));

vi.mock('@/lib/admin/common', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual };
});

import { DELETE } from '@/app/api/admin/categories/[id]/image/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// --- Tests ---

describe('DELETE /api/admin/categories/[id]/image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockDeleteCategoryImages.mockResolvedValue(undefined);
    mockCategoryExistsQuery.mockReturnValue({
      data: { id_categorie: 'cat-1' },
      error: null,
    });
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

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/categories/cat-1/image', {
        method: 'DELETE',
      }),
      createRouteContext('cat-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si id vide', async () => {
    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/categories//image', {
        method: 'DELETE',
      }),
      createRouteContext(''),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('invalide');
  });

  it('retourne 404 si catégorie introuvable', async () => {
    mockCategoryExistsQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/categories/unknown/image', {
        method: 'DELETE',
      }),
      createRouteContext('unknown'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('supprime l image avec succès', async () => {
    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/categories/cat-1/image', {
        method: 'DELETE',
      }),
      createRouteContext('cat-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteCategoryImages).toHaveBeenCalledWith('cat-1');
  });

  it('log la suppression image', async () => {
    await DELETE(
      new NextRequest('http://localhost/api/admin/categories/cat-1/image', {
        method: 'DELETE',
      }),
      createRouteContext('cat-1'),
    );

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'categories.image_delete',
      expect.objectContaining({ categoryId: 'cat-1' }),
    );
  });
});
