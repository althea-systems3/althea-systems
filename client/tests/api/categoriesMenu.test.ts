import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockFirestoreGet = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getFirestoreClient: () => ({
    collection: () => ({
      where: () => ({
        get: mockFirestoreGet,
      }),
    }),
  }),
}));

import { GET } from '@/app/api/categories/menu/route';

describe('GET /api/categories/menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
    mockFirestoreGet.mockResolvedValue({ docs: [] });
  });

  it('retourne les catégories actives triées par ordre_affiche', async () => {
    const categoriesFromDatabase = [
      { id_categorie: 'c1', nom: 'Audio Pro', slug: 'audio-pro', ordre_affiche: 1, image_url: null },
      { id_categorie: 'c2', nom: 'Réseau', slug: 'reseau', ordre_affiche: 2, image_url: '/img.png' },
    ];

    mockOrder.mockResolvedValue({
      data: categoriesFromDatabase,
      error: null,
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(responseBody.categories).toEqual([
      { nom: 'Audio Pro', slug: 'audio-pro', ordre_affiche: 1, image_url: null },
      { nom: 'Réseau', slug: 'reseau', ordre_affiche: 2, image_url: '/img.png' },
    ]);
    expect(mockSelect).toHaveBeenCalledWith('id_categorie, nom, slug, ordre_affiche, image_url');
    expect(mockEq).toHaveBeenCalledWith('statut', 'active');
  });

  it('enrichit image_url avec Firestore si disponible', async () => {
    const categoriesFromDatabase = [
      { id_categorie: 'c1', nom: 'Bijoux', slug: 'bijoux', ordre_affiche: 1, image_url: '/fallback.png' },
    ];

    mockOrder.mockResolvedValue({
      data: categoriesFromDatabase,
      error: null,
    });

    mockFirestoreGet.mockResolvedValue({
      docs: [
        { data: () => ({ categorie_id: 'c1', image_url: 'https://storage.googleapis.com/bijoux.webp' }) },
      ],
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(responseBody.categories[0].image_url).toBe('https://storage.googleapis.com/bijoux.webp');
  });

  it('retourne une erreur 500 en cas de problème base de données', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'database connection failed' },
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBeTruthy();
  });

  it('inclut les headers de cache pour performance CDN', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const response = await GET();

    expect(response.headers.get('Cache-Control')).toContain('s-maxage=60');
  });
});
