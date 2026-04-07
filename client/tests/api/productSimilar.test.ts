import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockProductSingle = vi.fn();
const mockCategoryLinks = vi.fn();
const mockProductLinks = vi.fn();
const mockSimilarProducts = vi.fn();
const mockFirestoreGet = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'produit_categorie') {
        return {
          select: (fields: string) => {
            if (fields === 'id_categorie') {
              return { eq: () => mockCategoryLinks() };
            }
            return { in: () => mockProductLinks() };
          },
        };
      }

      // table === 'produit'
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => mockProductSingle(),
            }),
          }),
          in: () => ({
            eq: () => mockSimilarProducts(),
          }),
        }),
      };
    },
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getFirestoreClient: () => ({
    collection: () => ({
      where: () => ({
        get: () => mockFirestoreGet(),
      }),
    }),
  }),
}));

vi.mock('@/lib/top-produits/constants', () => ({
  FIRESTORE_IMAGES_PRODUITS: 'ImagesProduits',
}));

vi.mock('@/lib/products/constants', () => ({
  MAX_SIMILAR_PRODUCTS: 6,
}));

// --- Import après mocks ---

import { GET } from '@/app/api/products/[slug]/similar/route';

// --- Helpers ---

function createRequest(slug: string): Request {
  return new Request(`http://localhost:3000/api/products/${slug}/similar`);
}

function createParams(slug: string): { params: Promise<{ slug: string }> } {
  return { params: Promise.resolve({ slug }) };
}

// --- Tests ---

describe('GET /api/products/[slug]/similar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('retourne 404 si le produit est inexistant', async () => {
    mockProductSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const response = await GET(
      createRequest('produit-inexistant'),
      createParams('produit-inexistant'),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.notFound).toBe(true);
    expect(body.products).toEqual([]);
  });

  it('retourne liste vide si aucune catégorie liée', async () => {
    mockProductSingle.mockResolvedValue({
      data: { id_produit: 'prod-001' },
      error: null,
    });

    mockCategoryLinks.mockResolvedValue({
      data: [],
      error: null,
    });

    const response = await GET(
      createRequest('interface-audio'),
      createParams('interface-audio'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products).toEqual([]);
  });

  it('retourne des produits similaires triés par disponibilité', async () => {
    // Arrange
    mockProductSingle.mockResolvedValue({
      data: { id_produit: 'prod-001' },
      error: null,
    });

    mockCategoryLinks.mockResolvedValue({
      data: [{ id_categorie: 'cat-001' }],
      error: null,
    });

    mockProductLinks.mockResolvedValue({
      data: [
        { id_produit: 'prod-002' },
        { id_produit: 'prod-003' },
      ],
      error: null,
    });

    mockSimilarProducts.mockResolvedValue({
      data: [
        {
          id_produit: 'prod-003',
          nom: 'Produit Rupture',
          slug: 'produit-rupture',
          prix_ttc: 199,
          quantite_stock: 0,
          statut: 'publie',
        },
        {
          id_produit: 'prod-002',
          nom: 'Produit Disponible',
          slug: 'produit-disponible',
          prix_ttc: 299,
          quantite_stock: 10,
          statut: 'publie',
        },
      ],
      error: null,
    });

    mockFirestoreGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            produit_id: 'prod-002',
            images: [{ url: '/img/prod2.webp', est_principale: true }],
          }),
        },
      ],
    });

    // Act
    const response = await GET(
      createRequest('interface-audio'),
      createParams('interface-audio'),
    );

    // Assert
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products).toHaveLength(2);

    // NOTE: Produit disponible doit apparaître en premier
    expect(body.products[0].id).toBe('prod-002');
    expect(body.products[0].isAvailable).toBe(true);
    expect(body.products[0].imageUrl).toBe('/img/prod2.webp');

    expect(body.products[1].id).toBe('prod-003');
    expect(body.products[1].isAvailable).toBe(false);
    expect(body.products[1].imageUrl).toBeNull();
  });

  it('exclut le produit courant des résultats', async () => {
    mockProductSingle.mockResolvedValue({
      data: { id_produit: 'prod-001' },
      error: null,
    });

    mockCategoryLinks.mockResolvedValue({
      data: [{ id_categorie: 'cat-001' }],
      error: null,
    });

    // NOTE: Même si le produit courant apparaît dans les liens, il est filtré
    mockProductLinks.mockResolvedValue({
      data: [
        { id_produit: 'prod-001' },
        { id_produit: 'prod-002' },
      ],
      error: null,
    });

    mockSimilarProducts.mockResolvedValue({
      data: [
        {
          id_produit: 'prod-002',
          nom: 'Autre Produit',
          slug: 'autre-produit',
          prix_ttc: 150,
          quantite_stock: 5,
          statut: 'publie',
        },
      ],
      error: null,
    });

    mockFirestoreGet.mockResolvedValue({ docs: [] });

    const response = await GET(
      createRequest('interface-audio'),
      createParams('interface-audio'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products).toHaveLength(1);
    expect(body.products[0].id).toBe('prod-002');
  });
});
