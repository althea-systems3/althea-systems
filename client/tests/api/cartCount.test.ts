import { describe, expect, it, vi, beforeEach } from 'vitest';

// -- Mocks Supabase --

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

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
    from: () => ({ select: mockSelect }),
  }),
}));

// -- Mock session panier guest --

const mockGetCartSessionId = vi.fn();

vi.mock('@/lib/auth/cartSession', () => ({
  getCartSessionId: () => mockGetCartSessionId(),
}));

import { GET } from '@/app/api/cart/count/route';

describe('GET /api/cart/count', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ single: mockSingle });
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
    mockSingle.mockResolvedValueOnce({
      data: { id_panier: 'cart-abc' },
    });
    mockEq.mockResolvedValueOnce({
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
    mockSingle.mockResolvedValueOnce({
      data: { id_panier: 'cart-guest' },
    });
    mockEq.mockResolvedValueOnce({
      data: [
        { quantite: 3, produit: { prix_ttc: 8.00 } },
      ],
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
    mockSingle.mockResolvedValueOnce({
      data: { id_panier: 'cart-empty' },
    });
    mockEq.mockResolvedValueOnce({ data: [] });

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ count: 0, total: 0 });
  });
});
