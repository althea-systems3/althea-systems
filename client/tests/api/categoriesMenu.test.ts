import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

import { GET } from '@/app/api/categories/menu/route';

describe('GET /api/categories/menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
  });

  it('retourne les catégories actives triées par ordre_affiche', async () => {
    const categoriesFromDatabase = [
      { nom: 'Audio Pro', slug: 'audio-pro', ordre_affiche: 1, image_url: null },
      { nom: 'Réseau', slug: 'reseau', ordre_affiche: 2, image_url: null },
    ];

    mockOrder.mockResolvedValue({
      data: categoriesFromDatabase,
      error: null,
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(responseBody.categories).toEqual(categoriesFromDatabase);
    expect(mockSelect).toHaveBeenCalledWith('nom, slug, ordre_affiche, image_url');
    expect(mockEq).toHaveBeenCalledWith('statut', 'active');
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
