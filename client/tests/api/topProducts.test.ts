import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockSupabaseOrder = vi.fn();
const mockFirestoreDocs = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => mockSupabaseOrder(),
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
        get: () => mockFirestoreDocs(),
      }),
    }),
  }),
}));

import { GET } from '@/app/api/top-products/route';

// --- Tests GET ---

describe('GET /api/top-products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('retourne le fallback si pas de config Supabase', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isFallbackData).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
  });

  it('retourne le fallback si erreur Supabase', async () => {
    mockSupabaseOrder.mockResolvedValue({
      data: null,
      error: { message: 'connection failed' },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isFallbackData).toBe(true);
  });

  it('retourne le fallback si aucun top produit', async () => {
    mockSupabaseOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isFallbackData).toBe(true);
  });

  it('retourne les top produits enrichis avec images Firestore', async () => {
    mockSupabaseOrder.mockResolvedValue({
      data: [
        {
          id_produit: 'p1',
          nom: 'Produit A',
          slug: 'produit-a',
          prix_ttc: 49.99,
          quantite_stock: 10,
          priorite: 1,
          statut: 'publie',
          est_top_produit: true,
        },
        {
          id_produit: 'p2',
          nom: 'Produit B',
          slug: 'produit-b',
          prix_ttc: 99.99,
          quantite_stock: 0,
          priorite: 2,
          statut: 'publie',
          est_top_produit: true,
        },
      ],
      error: null,
    });

    mockFirestoreDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            produit_id: 'p1',
            image_url: 'https://storage.example.com/products/p1/image.webp',
          }),
        },
      ],
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isFallbackData).toBe(false);
    expect(body.products).toHaveLength(2);
    expect(body.products[0].imageUrl).toBe(
      'https://storage.example.com/products/p1/image.webp',
    );
    expect(body.products[0].isAvailable).toBe(true);
    expect(body.products[1].imageUrl).toBeNull();
    expect(body.products[1].isAvailable).toBe(false);
  });

  it('retourne les produits même si Firestore échoue', async () => {
    mockSupabaseOrder.mockResolvedValue({
      data: [
        {
          id_produit: 'p1',
          nom: 'Produit A',
          slug: 'produit-a',
          prix_ttc: 29.99,
          quantite_stock: 5,
          priorite: 1,
          statut: 'publie',
          est_top_produit: true,
        },
      ],
      error: null,
    });

    mockFirestoreDocs.mockRejectedValue(new Error('Firestore down'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isFallbackData).toBe(false);
    expect(body.products).toHaveLength(1);
    expect(body.products[0].imageUrl).toBeNull();
  });
});
