import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockFetchProductImages = vi.fn();

const mockProductSingleQuery = vi.fn();
const mockSlugCheckQuery = vi.fn();
const mockUpdateQuery = vi.fn();
const mockDeleteQuery = vi.fn();
const mockCategoryLinksQuery = vi.fn();
const mockCategoriesQuery = vi.fn();
const mockCategoryDeleteQuery = vi.fn();
const mockCategoryInsertQuery = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/firebase/logActivity', () => ({
  logAdminActivity: (...args: unknown[]) => mockLogAdminActivity(...args),
}));

vi.mock('@/lib/admin/productImages', () => ({
  fetchProductImages: (...args: unknown[]) => mockFetchProductImages(...args),
  extractMainImageUrl: () => null,
}));

function createChainableQuery(resolveFn: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.eq = self;
  chain.neq = self;
  chain.or = self;
  chain.gt = self;
  chain.gte = self;
  chain.lt = self;
  chain.lte = self;
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
          select: (...args: unknown[]) => {
            const selectArg = typeof args[0] === 'string' ? args[0] : '*';

            if (selectArg === 'id_produit') {
              return createChainableQuery(() => mockSlugCheckQuery());
            }

            return createChainableQuery(() => mockProductSingleQuery());
          },
          update: () => createChainableQuery(() => mockUpdateQuery()),
          delete: () => createChainableQuery(() => mockDeleteQuery()),
        };
      }

      if (table === 'produit_categorie') {
        return {
          select: () => createChainableQuery(() => mockCategoryLinksQuery()),
          delete: () => createChainableQuery(() => mockCategoryDeleteQuery()),
          insert: (...args: unknown[]) => mockCategoryInsertQuery(...args),
        };
      }

      if (table === 'categorie') {
        return {
          select: () => createChainableQuery(() => mockCategoriesQuery()),
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

import { GET, PATCH, DELETE } from '@/app/api/admin/produits/[id]/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createPatchRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/admin/produits/p1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const SAMPLE_PRODUCT = {
  id_produit: 'p1',
  nom: 'Produit Test',
  description: 'Description test',
  caracteristique_tech: null,
  prix_ht: 10.0,
  tva: '20',
  prix_ttc: 12.0,
  quantite_stock: 5,
  statut: 'publie',
  slug: 'produit-test',
  date_creation: '2025-01-15T10:00:00Z',
};

function setupDefaultMocks() {
  mockVerifyAdminAccess.mockResolvedValue(null);
  mockGetCurrentUser.mockResolvedValue({
    user: { id: 'admin-1' },
    userProfile: { est_admin: true },
  });
  mockLogAdminActivity.mockResolvedValue(undefined);
  mockFetchProductImages.mockResolvedValue([]);
  mockProductSingleQuery.mockReturnValue({
    data: SAMPLE_PRODUCT,
    error: null,
  });
  mockCategoryLinksQuery.mockReturnValue({
    data: [{ id_categorie: 'c1' }],
    error: null,
  });
  mockCategoriesQuery.mockReturnValue({
    data: [{ id_categorie: 'c1', nom: 'Catégorie 1' }],
    error: null,
  });
}

// --- Tests GET ---

describe('GET /api/admin/produits/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await GET(
      new Request('http://localhost/api/admin/produits/p1'),
      createRouteContext('p1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si id vide', async () => {
    const response = await GET(
      new Request('http://localhost/api/admin/produits/'),
      createRouteContext(''),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('id_invalid');
  });

  it('retourne 404 si produit introuvable', async () => {
    mockProductSingleQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await GET(
      new Request('http://localhost/api/admin/produits/unknown'),
      createRouteContext('unknown'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('product_not_found');
  });

  it('retourne le détail complet du produit', async () => {
    const response = await GET(
      new Request('http://localhost/api/admin/produits/p1'),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.product.id_produit).toBe('p1');
    expect(body.product.nom).toBe('Produit Test');
    expect(body.product.categories).toHaveLength(1);
    expect(body.product.prix_ht).toBe(10.0);
    expect(body.product.prix_ttc).toBe(12.0);
  });
});

// --- Tests PATCH ---

describe('PATCH /api/admin/produits/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    mockUpdateQuery.mockReturnValue({ error: null });
    mockSlugCheckQuery.mockReturnValue({ data: [], error: null });
    mockCategoryDeleteQuery.mockReturnValue({ error: null });
    mockCategoryInsertQuery.mockReturnValue({ error: null });
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await PATCH(
      createPatchRequest({ nom: 'Test' }),
      createRouteContext('p1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 404 si produit introuvable', async () => {
    mockProductSingleQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await PATCH(
      createPatchRequest({ nom: 'Test' }),
      createRouteContext('unknown'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('product_not_found');
  });

  it('met à jour le nom du produit', async () => {
    const updatedProduct = { ...SAMPLE_PRODUCT, nom: 'Nouveau Nom' };
    mockProductSingleQuery
      .mockReturnValueOnce({ data: SAMPLE_PRODUCT, error: null })
      .mockReturnValueOnce({ data: updatedProduct, error: null });

    const response = await PATCH(
      createPatchRequest({ nom: 'Nouveau Nom' }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.product.nom).toBe('Nouveau Nom');
  });

  it('recalcule le prix TTC quand prix_ht change', async () => {
    const updatedProduct = {
      ...SAMPLE_PRODUCT,
      prix_ht: 20.0,
      prix_ttc: 24.0,
    };
    mockProductSingleQuery
      .mockReturnValueOnce({ data: SAMPLE_PRODUCT, error: null })
      .mockReturnValueOnce({ data: updatedProduct, error: null });

    const response = await PATCH(
      createPatchRequest({ prix_ht: 20 }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.product.prix_ht).toBe(20.0);
    expect(body.product.prix_ttc).toBe(24.0);
  });

  it('retourne 400 si slug déjà utilisé', async () => {
    mockSlugCheckQuery.mockReturnValue({
      data: [{ id_produit: 'other-p' }],
      error: null,
    });

    const response = await PATCH(
      createPatchRequest({ slug: 'existing-slug' }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('slug_already_used');
  });

  it('log la mise à jour avec les champs modifiés', async () => {
    mockProductSingleQuery
      .mockReturnValueOnce({ data: SAMPLE_PRODUCT, error: null })
      .mockReturnValueOnce({ data: SAMPLE_PRODUCT, error: null });

    await PATCH(
      createPatchRequest({ nom: 'Modifié' }),
      createRouteContext('p1'),
    );

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'products.update',
      expect.objectContaining({
        productId: 'p1',
        updatedFields: expect.arrayContaining(['nom']),
      }),
    );
  });
});

// --- Tests DELETE ---

describe('DELETE /api/admin/produits/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    mockDeleteQuery.mockReturnValue({ error: null });
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
      new Request('http://localhost/api/admin/produits/p1', {
        method: 'DELETE',
      }),
      createRouteContext('p1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si id vide', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/admin/produits/', {
        method: 'DELETE',
      }),
      createRouteContext(''),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('id_invalid');
  });

  it('supprime le produit avec succès', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/admin/produits/p1', {
        method: 'DELETE',
      }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('retourne 400 si contrainte FK empêche la suppression', async () => {
    mockDeleteQuery.mockReturnValue({
      error: { message: 'foreign key constraint' },
    });

    const response = await DELETE(
      new Request('http://localhost/api/admin/produits/p1', {
        method: 'DELETE',
      }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('admin_product_delete_failed');
  });

  it('log la suppression du produit', async () => {
    await DELETE(
      new Request('http://localhost/api/admin/produits/p1', {
        method: 'DELETE',
      }),
      createRouteContext('p1'),
    );

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'products.delete',
      expect.objectContaining({ productId: 'p1' }),
    );
  });
});
