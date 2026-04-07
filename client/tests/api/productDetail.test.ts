import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockSupabaseSingle = vi.fn();
const mockFirestoreGet = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => mockSupabaseSingle(),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getFirestoreClient: () => ({
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: () => mockFirestoreGet(),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/top-produits/constants', () => ({
  FIRESTORE_IMAGES_PRODUITS: 'ImagesProduits',
}));

// --- Import après mocks ---

import { GET } from '@/app/api/products/[slug]/route';

// --- Helpers ---

const PUBLISHED_PRODUCT = {
  id_produit: 'prod-001',
  nom: 'Interface Audio DSP-24',
  description: 'Interface audio 24 canaux',
  slug: 'interface-audio-dsp-24',
  prix_ht: 541.67,
  tva: '20',
  prix_ttc: 649.99,
  quantite_stock: 12,
  statut: 'publie',
  priorite: 1,
  est_top_produit: true,
  caracteristique_tech: { canaux: 24, connectique: 'USB-C' },
};

const FIRESTORE_IMAGES = {
  produit_id: 'prod-001',
  images: [
    { url: '/products/img2.webp', ordre: 2, est_principale: false, alt_text: 'Vue arrière' },
    { url: '/products/img1.webp', ordre: 1, est_principale: true, alt_text: 'Vue de face' },
  ],
};

function createRequest(slug: string): Request {
  return new Request(`http://localhost:3000/api/products/${slug}`);
}

function createParams(slug: string): { params: Promise<{ slug: string }> } {
  return { params: Promise.resolve({ slug }) };
}

// --- Tests ---

describe('GET /api/products/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('retourne 404 si le produit est inexistant', async () => {
    mockSupabaseSingle.mockResolvedValue({
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
    expect(body.product).toBeNull();
  });

  it('retourne 404 si le produit est en brouillon', async () => {
    // NOTE: Le filtre .eq('statut', 'publie') exclut les brouillons côté SQL
    mockSupabaseSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const response = await GET(
      createRequest('passerelle-iot-gateway'),
      createParams('passerelle-iot-gateway'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne 200 avec le produit complet et images triées', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: PUBLISHED_PRODUCT,
      error: null,
    });

    mockFirestoreGet.mockResolvedValue({
      empty: false,
      docs: [{ data: () => FIRESTORE_IMAGES }],
    });

    const response = await GET(
      createRequest('interface-audio-dsp-24'),
      createParams('interface-audio-dsp-24'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.product.id).toBe('prod-001');
    expect(body.product.name).toBe('Interface Audio DSP-24');
    expect(body.product.priceTtc).toBe(649.99);
    expect(body.product.isAvailable).toBe(true);
    expect(body.product.characteristics).toEqual({ canaux: 24, connectique: 'USB-C' });

    // NOTE: Les images doivent être triées par ordre ASC
    expect(body.product.images).toHaveLength(2);
    expect(body.product.images[0].ordre).toBe(1);
    expect(body.product.images[0].isMain).toBe(true);
    expect(body.product.images[1].ordre).toBe(2);
  });

  it('retourne 200 avec images vides si Firestore échoue', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: PUBLISHED_PRODUCT,
      error: null,
    });

    mockFirestoreGet.mockRejectedValue(new Error('Firestore down'));

    const response = await GET(
      createRequest('interface-audio-dsp-24'),
      createParams('interface-audio-dsp-24'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.product.images).toEqual([]);
  });

  it('retourne isAvailable false si stock à zéro', async () => {
    const outOfStockProduct = { ...PUBLISHED_PRODUCT, quantite_stock: 0 };

    mockSupabaseSingle.mockResolvedValue({
      data: outOfStockProduct,
      error: null,
    });

    mockFirestoreGet.mockResolvedValue({ empty: true, docs: [] });

    const response = await GET(
      createRequest('interface-audio-dsp-24'),
      createParams('interface-audio-dsp-24'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.product.isAvailable).toBe(false);
    expect(body.product.stockQuantity).toBe(0);
  });

  it('retourne characteristics null si non défini', async () => {
    const productWithoutChars = { ...PUBLISHED_PRODUCT, caracteristique_tech: null };

    mockSupabaseSingle.mockResolvedValue({
      data: productWithoutChars,
      error: null,
    });

    mockFirestoreGet.mockResolvedValue({ empty: true, docs: [] });

    const response = await GET(
      createRequest('interface-audio-dsp-24'),
      createParams('interface-audio-dsp-24'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.product.characteristics).toBeNull();
  });
});
