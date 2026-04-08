import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockCategoriesOrder = vi.fn();
const mockPriceMinSingle = vi.fn();
const mockPriceMaxSingle = vi.fn();

let priceCallIndex = 0;

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'categorie') {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockCategoriesOrder(),
            }),
          }),
        };
      }

      // table === 'produit' — deux appels : min puis max
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                single: () => {
                  const currentIndex = priceCallIndex;
                  priceCallIndex++;

                  if (currentIndex % 2 === 0) {
                    return mockPriceMinSingle();
                  }
                  return mockPriceMaxSingle();
                },
              }),
            }),
          }),
        }),
      };
    },
  }),
}));

// --- Import après mocks ---

import { GET } from '@/app/api/search/facets/route';

// --- Tests ---

describe('GET /api/search/facets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    priceCallIndex = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('retourne les catégories actives et les bornes de prix', async () => {
    // Arrange
    mockCategoriesOrder.mockResolvedValue({
      data: [
        { id_categorie: 'cat-001', nom: 'Audio Professionnel', slug: 'audio-professionnel' },
        { id_categorie: 'cat-002', nom: 'Réseaux Industriels', slug: 'reseaux-industriels' },
      ],
      error: null,
    });

    mockPriceMinSingle.mockResolvedValue({
      data: { prix_ttc: 55.00 },
      error: null,
    });

    mockPriceMaxSingle.mockResolvedValue({
      data: { prix_ttc: 1499.00 },
      error: null,
    });

    // Act
    const response = await GET();

    // Assert
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.categories).toHaveLength(2);
    expect(body.categories[0].name).toBe('Audio Professionnel');
    expect(body.categories[0].id).toBe('cat-001');
    expect(body.categories[0].slug).toBe('audio-professionnel');

    expect(body.priceRange.min).toBe(55.00);
    expect(body.priceRange.max).toBe(1499.00);

    expect(body.sortOptions).toHaveLength(4);
    expect(body.sortOptions[0].value).toBe('relevance');
  });

  it('retourne priceRange null si aucun produit', async () => {
    mockCategoriesOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    mockPriceMinSingle.mockResolvedValue({
      data: null,
      error: { message: 'No rows' },
    });

    mockPriceMaxSingle.mockResolvedValue({
      data: null,
      error: { message: 'No rows' },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.categories).toEqual([]);
    expect(body.priceRange).toBeNull();
    expect(body.sortOptions).toHaveLength(4);
  });

  it('retourne toujours les sortOptions même en erreur', async () => {
    mockCategoriesOrder.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    mockPriceMinSingle.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    mockPriceMaxSingle.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.categories).toEqual([]);
    expect(body.priceRange).toBeNull();
    expect(body.sortOptions).toHaveLength(4);
  });
});
