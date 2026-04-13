import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockProductDeleteQuery = vi.fn();
const mockProductUpdateQuery = vi.fn();
const mockCategorySingleQuery = vi.fn();
const mockCategoryLinkDeleteQuery = vi.fn();
const mockCategoryLinkInsertQuery = vi.fn();

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
  chain.order = self;
  chain.limit = self;
  chain.select = () => chain;
  chain.single = resolveFn;
  chain.then = (resolve: (v: unknown) => unknown) => {
    return Promise.resolve(resolveFn()).then(resolve);
  };

  return chain;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'produit') {
        return {
          delete: () => createChainableQuery(() => mockProductDeleteQuery()),
          update: () => createChainableQuery(() => mockProductUpdateQuery()),
        };
      }

      if (table === 'categorie') {
        return {
          select: () => createChainableQuery(() => mockCategorySingleQuery()),
        };
      }

      if (table === 'produit_categorie') {
        return {
          delete: () =>
            createChainableQuery(() => mockCategoryLinkDeleteQuery()),
          insert: () => mockCategoryLinkInsertQuery(),
        };
      }

      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
  }),
}));

vi.mock('@/lib/admin/common', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual };
});

import { POST } from '@/app/api/admin/produits/bulk/route';

// --- Helpers ---

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/produits/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Tests ---

describe('POST /api/admin/produits/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
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
      createPostRequest({ action: 'delete', productIds: ['p1'] }),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si action invalide', async () => {
    const response = await POST(
      createPostRequest({ action: 'invalid', productIds: ['p1'] }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('bulk_action_invalid');
  });

  it('retourne 400 si aucun productIds', async () => {
    const response = await POST(
      createPostRequest({ action: 'delete', productIds: [] }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('bulk_product_ids_required');
  });

  it('supprime les produits avec succès', async () => {
    mockProductDeleteQuery.mockReturnValue({ error: null });

    const response = await POST(
      createPostRequest({ action: 'delete', productIds: ['p1', 'p2'] }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.action).toBe('delete');
    expect(body.affectedCount).toBe(2);
  });

  it('retourne 400 si suppression échoue', async () => {
    mockProductDeleteQuery.mockReturnValue({
      error: { message: 'FK constraint' },
    });

    const response = await POST(
      createPostRequest({ action: 'delete', productIds: ['p1'] }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('bulk_delete_failed');
  });

  it('publie les produits avec succès', async () => {
    mockProductUpdateQuery.mockReturnValue({ error: null });

    const response = await POST(
      createPostRequest({ action: 'publish', productIds: ['p1', 'p2'] }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('publish');
    expect(body.affectedCount).toBe(2);
  });

  it('dépublie les produits avec succès', async () => {
    mockProductUpdateQuery.mockReturnValue({ error: null });

    const response = await POST(
      createPostRequest({ action: 'unpublish', productIds: ['p1'] }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('unpublish');
  });

  it('retourne 400 si catégorie manquante pour set_category', async () => {
    const response = await POST(
      createPostRequest({ action: 'set_category', productIds: ['p1'] }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('bulk_category_required');
  });

  it('assigne une catégorie avec succès', async () => {
    mockCategorySingleQuery.mockReturnValue({
      data: { id_categorie: 'c1' },
      error: null,
    });
    mockCategoryLinkDeleteQuery.mockReturnValue({ error: null });
    mockCategoryLinkInsertQuery.mockReturnValue({ error: null });

    const response = await POST(
      createPostRequest({
        action: 'set_category',
        productIds: ['p1', 'p2'],
        categoryId: 'c1',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('set_category');
    expect(body.affectedCount).toBe(2);
  });

  it('log l activité après action réussie', async () => {
    mockProductDeleteQuery.mockReturnValue({ error: null });

    await POST(
      createPostRequest({ action: 'delete', productIds: ['p1', 'p2'] }),
    );

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'products.bulk',
      expect.objectContaining({
        action: 'delete',
        productIds: ['p1', 'p2'],
        affectedCount: 2,
      }),
    );
  });
});
