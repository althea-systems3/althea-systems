import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockFetchProductImagesByIds = vi.fn();

const mockProductsQuery = vi.fn();
const mockCategoryLinksQuery = vi.fn();
const mockCategoriesQuery = vi.fn();
const mockSlugCheckQuery = vi.fn();
const mockInsertQuery = vi.fn();
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
  fetchProductImagesByIds: (...args: unknown[]) =>
    mockFetchProductImagesByIds(...args),
  extractMainImageUrl: () => null,
}));

function createChainableQuery(resolveFn: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.eq = self;
  chain.or = self;
  chain.gt = self;
  chain.gte = self;
  chain.lt = self;
  chain.lte = self;
  chain.in = self;
  chain.order = self;
  chain.limit = self;
  chain.select = (...args: unknown[]) => {
    const hasHeadOption =
      args.length > 1 &&
      typeof args[1] === 'object' &&
      args[1] !== null &&
      'head' in args[1];

    if (hasHeadOption) {
      return chain;
    }

    return chain;
  };
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

            return createChainableQuery(() => mockProductsQuery());
          },
          insert: (...args: unknown[]) => ({
            select: () => ({
              single: () => mockInsertQuery(...args),
            }),
          }),
        };
      }

      if (table === 'produit_categorie') {
        return {
          select: () => createChainableQuery(() => mockCategoryLinksQuery()),
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

import { GET, POST } from '@/app/api/admin/produits/route';

// --- Helpers ---

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const searchParams = new URLSearchParams(params);
  return new NextRequest(
    `http://localhost/api/admin/produits?${searchParams.toString()}`,
  );
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/produits', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const SAMPLE_PRODUCTS = [
  {
    id_produit: 'p1',
    nom: 'Produit A',
    description: 'Description A',
    caracteristique_tech: null,
    prix_ht: 10.0,
    tva: '20',
    prix_ttc: 12.0,
    quantite_stock: 5,
    statut: 'publie',
    slug: 'produit-a',
    date_creation: '2025-01-15T10:00:00Z',
  },
  {
    id_produit: 'p2',
    nom: 'Produit B',
    description: null,
    caracteristique_tech: null,
    prix_ht: 20.0,
    tva: '10',
    prix_ttc: 22.0,
    quantite_stock: 0,
    statut: 'brouillon',
    slug: 'produit-b',
    date_creation: '2025-02-20T14:00:00Z',
  },
];

// --- Tests GET ---

describe('GET /api/admin/produits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockFetchProductImagesByIds.mockResolvedValue(new Map());
  });

  it('retourne 401 si utilisateur non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentification requise.');
  });

  it('retourne la liste paginée des produits', async () => {
    mockProductsQuery.mockReturnValue({
      data: SAMPLE_PRODUCTS,
      error: null,
    });
    mockCategoryLinksQuery.mockReturnValue({
      data: [{ id_produit: 'p1', id_categorie: 'c1' }],
      error: null,
    });
    mockCategoriesQuery.mockReturnValue({
      data: [{ id_categorie: 'c1', nom: 'Catégorie 1' }],
      error: null,
    });

    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.products).toHaveLength(2);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.totalItems).toBe(2);
    expect(body.categories).toHaveLength(1);
  });

  it('retourne 500 si erreur base de données', async () => {
    mockProductsQuery.mockReturnValue({
      data: null,
      error: { message: 'connection failed' },
    });

    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe('admin_products_read_failed');
  });
});

// --- Tests POST ---

describe('POST /api/admin/produits', () => {
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

    const response = await POST(createPostRequest({}));

    expect(response.status).toBe(401);
  });

  it('retourne 400 si nom manquant', async () => {
    const response = await POST(
      createPostRequest({ prix_ht: 10, quantite_stock: 5 }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('name_required');
  });

  it('retourne 400 si prix invalide', async () => {
    const response = await POST(
      createPostRequest({ nom: 'Test', quantite_stock: 5 }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('price_invalid');
  });

  it('retourne 400 si stock invalide', async () => {
    const response = await POST(
      createPostRequest({ nom: 'Test', prix_ht: 10, quantite_stock: -1 }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('stock_invalid');
  });

  it('retourne 400 si slug déjà utilisé', async () => {
    mockSlugCheckQuery.mockReturnValue({
      data: [{ id_produit: 'existing' }],
      error: null,
    });

    const response = await POST(
      createPostRequest({
        nom: 'Test',
        prix_ht: 10,
        quantite_stock: 5,
        slug: 'existing-slug',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('slug_already_used');
  });

  it('crée un produit avec succès et log', async () => {
    mockSlugCheckQuery.mockReturnValue({
      data: [],
      error: null,
    });

    const createdProduct = {
      id_produit: 'new-p1',
      nom: 'Nouveau Produit',
      description: null,
      caracteristique_tech: null,
      prix_ht: 10,
      tva: '20',
      prix_ttc: 12,
      quantite_stock: 5,
      statut: 'brouillon',
      slug: 'nouveau-produit',
      date_creation: '2025-03-01T00:00:00Z',
    };

    mockInsertQuery.mockResolvedValue({
      data: createdProduct,
      error: null,
    });

    const response = await POST(
      createPostRequest({
        nom: 'Nouveau Produit',
        prix_ht: 10,
        quantite_stock: 5,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.product.id_produit).toBe('new-p1');
    expect(body.product.nom).toBe('Nouveau Produit');
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'products.create',
      expect.objectContaining({ productId: 'new-p1' }),
    );
  });

  it('lie les catégories au produit créé', async () => {
    mockSlugCheckQuery.mockReturnValue({ data: [], error: null });
    mockInsertQuery.mockResolvedValue({
      data: {
        id_produit: 'new-p2',
        nom: 'Produit Cat',
        prix_ht: 15,
        tva: '20',
        prix_ttc: 18,
        quantite_stock: 3,
        statut: 'brouillon',
        slug: 'produit-cat',
        date_creation: '2025-03-01T00:00:00Z',
      },
      error: null,
    });
    mockCategoryInsertQuery.mockResolvedValue({ error: null });

    const response = await POST(
      createPostRequest({
        nom: 'Produit Cat',
        prix_ht: 15,
        quantite_stock: 3,
        categoryIds: ['c1', 'c2'],
      }),
    );

    expect(response.status).toBe(201);
    expect(mockCategoryInsertQuery).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id_produit: 'new-p2', id_categorie: 'c1' }),
      ]),
    );
  });
});
