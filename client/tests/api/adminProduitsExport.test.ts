import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockProductsQuery = vi.fn();
const mockCategoryLinksQuery = vi.fn();
const mockCategoriesQuery = vi.fn();
const mockCategoryFilterQuery = vi.fn();

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

  chain.eq = () => {
    return createChainableQuery(resolveFn);
  };
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
          select: () => createChainableQuery(() => mockProductsQuery()),
        };
      }

      if (table === 'produit_categorie') {
        return {
          select: (...args: unknown[]) => {
            const selectArg = typeof args[0] === 'string' ? args[0] : '';

            if (selectArg === 'id_produit') {
              return createChainableQuery(() => mockCategoryFilterQuery());
            }

            return createChainableQuery(() => mockCategoryLinksQuery());
          },
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

import { GET } from '@/app/api/admin/produits/export/route';

// --- Helpers ---

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const searchParams = new URLSearchParams(params);
  return new NextRequest(
    `http://localhost/api/admin/produits/export?${searchParams.toString()}`,
  );
}

const SAMPLE_PRODUCTS = [
  {
    id_produit: 'p1',
    nom: 'Produit A',
    description: 'Description A',
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
    prix_ht: 20.0,
    tva: '10',
    prix_ttc: 22.0,
    quantite_stock: 0,
    statut: 'brouillon',
    slug: 'produit-b',
    date_creation: '2025-02-20T14:00:00Z',
  },
];

// --- Tests ---

describe('GET /api/admin/produits/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockProductsQuery.mockReturnValue({
      data: SAMPLE_PRODUCTS,
      error: null,
    });
    mockCategoryLinksQuery.mockReturnValue({
      data: [{ id_produit: 'p1', id_categorie: 'c1' }],
      error: null,
    });
    mockCategoriesQuery.mockReturnValue({
      data: [{ id_categorie: 'c1', nom: 'Huiles' }],
      error: null,
    });
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

    expect(response.status).toBe(401);
  });

  it('retourne un CSV par défaut avec Content-Type correct', async () => {
    const response = await GET(createGetRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'text/csv; charset=utf-8',
    );
    expect(response.headers.get('Content-Disposition')).toContain(
      'produits-export.csv',
    );

    const content = await response.text();
    expect(content).toContain('Nom');
    expect(content).toContain('Produit A');
    expect(content).toContain('Produit B');
  });

  it('retourne un fichier Excel XML si format=excel', async () => {
    const response = await GET(createGetRequest({ format: 'excel' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.ms-excel',
    );
    expect(response.headers.get('Content-Disposition')).toContain(
      'produits-export.xls',
    );

    const content = await response.text();
    expect(content).toContain('<?xml');
    expect(content).toContain('Produit A');
  });

  it('inclut les catégories dans le contenu exporté', async () => {
    const response = await GET(createGetRequest());
    const content = await response.text();

    expect(content).toContain('Huiles');
  });

  it('log l activité export avec le format', async () => {
    await GET(createGetRequest({ format: 'excel' }));

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'products.export',
      expect.objectContaining({ format: 'excel', exportedCount: 2 }),
    );
  });

  it('retourne 500 si erreur base de données', async () => {
    mockProductsQuery.mockReturnValue({
      data: null,
      error: { message: 'connection failed' },
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('admin_products_export_failed');
  });
});
