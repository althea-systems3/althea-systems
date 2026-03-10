import { NextResponse } from 'next/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockVerifyCsrf = vi.fn();
const mockGetCartSessionId = vi.fn();
const mockClearCartSession = vi.fn();

// NOTE: Mocks admin Supabase par table et par type d'opération.
// panier : select().eq().single(), insert().select().single(), delete().eq()
// ligne_panier : select().eq(), upsert()
const mockPanierSelectSingle = vi.fn();
const mockPanierInsertSingle = vi.fn();
const mockPanierDeleteEq = vi.fn();
const mockLignePanierSelectEq = vi.fn();
const mockLignePanierUpsert = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/lib/auth/csrf', () => ({
  verifyCsrf: (request: unknown) => mockVerifyCsrf(request),
}));

vi.mock('@/lib/auth/cartSession', () => ({
  getCartSessionId: () => mockGetCartSessionId(),
  clearCartSession: () => mockClearCartSession(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (tableName: string) => {
      if (tableName === 'panier') {
        return {
          select: () => ({
            eq: () => ({ single: mockPanierSelectSingle }),
          }),
          insert: () => ({
            select: () => ({ single: mockPanierInsertSingle }),
          }),
          delete: () => ({ eq: mockPanierDeleteEq }),
        };
      }
      return {
        select: () => ({ eq: mockLignePanierSelectEq }),
        upsert: mockLignePanierUpsert,
      };
    },
  }),
}));

import { POST } from '@/app/api/auth/merge-cart/route';

function createMockRequest() {
  return {} as Parameters<typeof POST>[0];
}

describe('POST /api/auth/merge-cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCsrf.mockReturnValue(null);
  });

  it('retourne 403 quand la vérification CSRF échoue', async () => {
    const csrfErrorResponse = NextResponse.json(
      { error: 'CSRF rejeté' },
      { status: 403 },
    );
    mockVerifyCsrf.mockReturnValue(csrfErrorResponse);

    const response = await POST(createMockRequest());

    expect(response.status).toBe(403);
  });

  it('retourne 401 quand aucun utilisateur authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentification requise.');
  });

  it('retourne isMerged false quand aucune session guest', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    mockGetCartSessionId.mockResolvedValue(null);

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.isMerged).toBe(false);
    expect(body.reason).toBe('aucun_panier_guest');
  });

  it('fusionne le panier guest dans le panier user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    mockGetCartSessionId.mockResolvedValue('guest-session');

    // fetchGuestCart
    mockPanierSelectSingle.mockResolvedValueOnce({
      data: { id_panier: 'guest-cart-id' },
    });
    // fetchOrCreateUserCart
    mockPanierSelectSingle.mockResolvedValueOnce({
      data: { id_panier: 'user-cart-id' },
    });
    // mergeGuestLinesIntoUserCart
    mockLignePanierSelectEq.mockResolvedValueOnce({
      data: [{ id_produit: 'prod-1', quantite: 2 }],
    });
    mockLignePanierUpsert.mockResolvedValue({});
    // deleteGuestCart
    mockPanierDeleteEq.mockResolvedValue({});

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.isMerged).toBe(true);
    expect(mockLignePanierUpsert).toHaveBeenCalledOnce();
    expect(mockPanierDeleteEq).toHaveBeenCalledOnce();
    expect(mockClearCartSession).toHaveBeenCalledOnce();
  });
});
