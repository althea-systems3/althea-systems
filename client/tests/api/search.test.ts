import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockSupabaseProducts = vi.fn();
const mockCategoryLinks = vi.fn();
const mockFirestoreGet = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'produit_categorie') {
        return {
          select: () => ({
            in: () => mockCategoryLinks(),
          }),
        };
      }

      // table === 'produit'
      return {
        select: () => ({
          eq: () => {
            // NOTE: Retourne un objet chaînable pour les filtres optionnels
            const chainable = {
              gte: () => chainable,
              lte: () => chainable,
              gt: () => chainable,
              then: (resolve: (value: unknown) => void) => {
                const result = mockSupabaseProducts();
                resolve(result);
              },
            };
            return chainable;
          },
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

// --- Import après mocks ---

import { GET } from '@/app/api/search/route';

// --- Helpers ---

function createRequest(queryString: string = ''): Request {
  return new Request(`http://localhost:3000/api/search${queryString}`);
}

const PRODUCT_AUDIO = {
  id_produit: 'prod-001',
  nom: 'Interface Audio DSP-24',
  description: 'Interface audio 24 canaux avec traitement DSP',
  caracteristique_tech: { canaux: 24, connectique: 'USB-C' },
  prix_ht: 541.67,
  prix_ttc: 649.99,
  quantite_stock: 12,
  statut: 'publie',
  slug: 'interface-audio-dsp-24',
  priorite: 1,
  est_top_produit: true,
};

const PRODUCT_SWITCH = {
  id_produit: 'prod-002',
  nom: 'Switch Industriel SIR-16',
  description: 'Switch 16 ports Gigabit manageable',
  caracteristique_tech: { ports: 16, protocole: 'ERPS' },
  prix_ht: 749.17,
  prix_ttc: 899.00,
  quantite_stock: 6,
  statut: 'publie',
  slug: 'switch-industriel-sir-16',
  priorite: 3,
  est_top_produit: true,
};

const PRODUCT_OUT_OF_STOCK = {
  id_produit: 'prod-003',
  nom: 'Dalle Tactile DTI-15',
  description: 'Ecran tactile 15 pouces',
  caracteristique_tech: { taille: '15 pouces' },
  prix_ht: 832.50,
  prix_ttc: 999.00,
  quantite_stock: 0,
  statut: 'publie',
  slug: 'dalle-tactile-dti-15',
  priorite: 0,
  est_top_produit: false,
};

const ALL_PRODUCTS = [PRODUCT_AUDIO, PRODUCT_SWITCH, PRODUCT_OUT_OF_STOCK];

// --- Tests ---

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    mockFirestoreGet.mockResolvedValue({ docs: [] });
  });

  it('retourne tous les produits publiés sans filtre', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: ALL_PRODUCTS,
      error: null,
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products).toHaveLength(3);
    expect(body.pagination.total).toBe(3);
  });

  it('filtre par recherche texte et trie par pertinence', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: ALL_PRODUCTS,
      error: null,
    });

    const response = await GET(createRequest('?q=audio'));

    expect(response.status).toBe(200);
    const body = await response.json();

    // NOTE: Seul le produit audio correspond
    expect(body.products.length).toBeGreaterThanOrEqual(1);
    expect(body.products[0].name).toBe('Interface Audio DSP-24');
    expect(body.products[0].relevanceScore).toBeGreaterThan(0);
  });

  it('filtre par catégorie via produit_categorie', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: ALL_PRODUCTS,
      error: null,
    });

    mockCategoryLinks.mockResolvedValue({
      data: [{ id_produit: 'prod-001' }],
      error: null,
    });

    const response = await GET(createRequest('?categories=cat-audio'));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products).toHaveLength(1);
    expect(body.products[0].id).toBe('prod-001');
  });

  it('filtre available_only exclut les ruptures', async () => {
    // NOTE: Le filtre available_only est appliqué côté SQL (.gt)
    // On simule que Supabase ne retourne que les produits en stock
    mockSupabaseProducts.mockReturnValue({
      data: [PRODUCT_AUDIO, PRODUCT_SWITCH],
      error: null,
    });

    const response = await GET(createRequest('?available_only=true'));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products).toHaveLength(2);
    expect(
      body.products.every(
        (product: { isAvailable: boolean }) => product.isAvailable,
      ),
    ).toBe(true);
  });

  it('trie par prix ascendant', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: ALL_PRODUCTS,
      error: null,
    });

    const response = await GET(createRequest('?sort=price_asc'));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products[0].priceTtc).toBe(649.99);
    expect(body.products[1].priceTtc).toBe(899.00);
    expect(body.products[2].priceTtc).toBe(999.00);
  });

  it('trie par prix descendant', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: ALL_PRODUCTS,
      error: null,
    });

    const response = await GET(createRequest('?sort=price_desc'));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products[0].priceTtc).toBe(999.00);
    expect(body.products[2].priceTtc).toBe(649.99);
  });

  it('pagine correctement les résultats', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: ALL_PRODUCTS,
      error: null,
    });

    const response = await GET(createRequest('?page=1&limit=2'));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products).toHaveLength(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.totalPages).toBe(2);
  });

  it('recherche dans les caractéristiques techniques JSONB', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: ALL_PRODUCTS,
      error: null,
    });

    const response = await GET(createRequest('?q=USB-C'));

    expect(response.status).toBe(200);
    const body = await response.json();

    // NOTE: USB-C est dans caracteristique_tech du produit audio
    expect(body.products.length).toBeGreaterThanOrEqual(1);

    const hasAudioProduct = body.products.some(
      (product: { id: string }) => product.id === 'prod-001',
    );
    expect(hasAudioProduct).toBe(true);
  });

  it('retourne 500 si Supabase échoue', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: null,
      error: { message: 'Database error' },
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
  });

  it('enrichit avec images Firestore', async () => {
    mockSupabaseProducts.mockReturnValue({
      data: [PRODUCT_AUDIO],
      error: null,
    });

    mockFirestoreGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            produit_id: 'prod-001',
            images: [
              { url: '/products/audio.webp', est_principale: true },
            ],
          }),
        },
      ],
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.products[0].imageUrl).toBe('/products/audio.webp');
  });
});
