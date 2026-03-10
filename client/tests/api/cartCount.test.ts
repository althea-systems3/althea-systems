import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockGetCartSessionId = vi.fn();

// NOTE: from('panier') → .select().eq().limit(1).single()
// NOTE: from('ligne_panier') → .select().eq()
const mockPanierSingle = vi.fn();
const mockLignePanierEq = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (tableName: string) => {
      if (tableName === 'panier') {
        return {
          select: () => ({
            eq: () => ({ limit: () => ({ single: mockPanierSingle }) }),
          }),
        };
      }
      return {
        select: () => ({ eq: mockLignePanierEq }),
      };
    },
  }),
}));

vi.mock('@/lib/auth/cartSession', () => ({
  getCartSessionId: () => mockGetCartSessionId(),
}));

import { GET } from '@/app/api/cart/count/route';

describe('GET /api/cart/count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne un panier vide quand aucun utilisateur ni session guest', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockGetCartSessionId.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ count: 0, total: 0 });
  });

  it('retourne le count et total pour un utilisateur authentifié', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    mockPanierSingle.mockResolvedValueOnce({
      data: { id_panier: 'cart-abc' },
    });
    mockLignePanierEq.mockResolvedValueOnce({
      data: [
        { quantite: 2, produit: { prix_ttc: 10.50 } },
        { quantite: 1, produit: { prix_ttc: 5.00 } },
      ],
    });

    const response = await GET();
    const body = await response.json();

    expect(body.count).toBe(3);
    expect(body.total).toBe(26);
  });

  it('retourne le count et total pour un guest avec session cookie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockGetCartSessionId.mockResolvedValue('session-xyz');
    mockPanierSingle.mockResolvedValueOnce({
      data: { id_panier: 'cart-guest' },
    });
    mockLignePanierEq.mockResolvedValueOnce({
      data: [{ quantite: 3, produit: { prix_ttc: 8.00 } }],
    });

    const response = await GET();
    const body = await response.json();

    expect(body.count).toBe(3);
    expect(body.total).toBe(24);
  });

  it('retourne un panier vide quand le panier existe mais sans lignes', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-456' } },
    });
    mockPanierSingle.mockResolvedValueOnce({
      data: { id_panier: 'cart-empty' },
    });
    mockLignePanierEq.mockResolvedValueOnce({ data: [] });

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ count: 0, total: 0 });
  });
});
