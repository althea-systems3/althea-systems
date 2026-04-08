import { NextResponse } from 'next/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockVerifyCsrf = vi.fn();
const mockGetCartSessionId = vi.fn();
const mockClearCartSession = vi.fn();

const mockPanierSelectSingle = vi.fn();
const mockPanierInsertSingle = vi.fn();
const mockPanierDeleteEq = vi.fn();
const mockGuestLinesSelect = vi.fn();
const mockUserLinesSelect = vi.fn();
const mockProductStocksSelect = vi.fn();
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

      if (tableName === 'produit') {
        return {
          select: () => ({
            in: () => ({
              eq: () => mockProductStocksSelect(),
            }),
          }),
        };
      }

      // table === 'ligne_panier'
      return {
        select: () => ({
          eq: (_col: string, value: string) => {
            if (value === 'guest-cart-id') {
              return mockGuestLinesSelect();
            }

            return mockUserLinesSelect();
          },
        }),
        upsert: mockLignePanierUpsert,
      };
    },
  }),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/auth/merge-cart/route';

// --- Helpers ---

function createMockRequest() {
  return {} as Parameters<typeof POST>[0];
}

function setupAuthenticatedUser() {
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

  mockPanierDeleteEq.mockResolvedValue({});
  mockClearCartSession.mockResolvedValue(undefined);
}

// --- Tests ---

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

    expect(response.status).toBe(401);
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

  it('fusionne en additionnant les quantités guest et user', async () => {
    setupAuthenticatedUser();

    // Guest a 2 unités de prod-001
    mockGuestLinesSelect.mockResolvedValue({
      data: [{ id_produit: 'prod-001', quantite: 2 }],
    });

    // User a déjà 3 unités de prod-001
    mockUserLinesSelect.mockResolvedValue({
      data: [{ id_produit: 'prod-001', quantite: 3 }],
    });

    // Stock disponible : 10
    mockProductStocksSelect.mockResolvedValue({
      data: [{ id_produit: 'prod-001', quantite_stock: 10 }],
    });

    mockLignePanierUpsert.mockResolvedValue({});

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.isMerged).toBe(true);

    // Quantité combinée = 2 + 3 = 5 (< stock 10)
    expect(mockLignePanierUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantite: 5 }),
      expect.any(Object),
    );
  });

  it('plafonne la quantité combinée au stock disponible', async () => {
    setupAuthenticatedUser();

    // Guest a 8 unités
    mockGuestLinesSelect.mockResolvedValue({
      data: [{ id_produit: 'prod-001', quantite: 8 }],
    });

    // User a 7 unités → combiné = 15
    mockUserLinesSelect.mockResolvedValue({
      data: [{ id_produit: 'prod-001', quantite: 7 }],
    });

    // Stock = 10 → plafonné à 10
    mockProductStocksSelect.mockResolvedValue({
      data: [{ id_produit: 'prod-001', quantite_stock: 10 }],
    });

    mockLignePanierUpsert.mockResolvedValue({});

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.isMerged).toBe(true);
    expect(mockLignePanierUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantite: 10 }),
      expect.any(Object),
    );
  });

  it('exclut les produits non publiés du merge', async () => {
    setupAuthenticatedUser();

    // Guest a un produit non publié
    mockGuestLinesSelect.mockResolvedValue({
      data: [{ id_produit: 'prod-unpublished', quantite: 3 }],
    });

    mockUserLinesSelect.mockResolvedValue({
      data: [],
    });

    // Produit non publié → absent de la liste retournée
    mockProductStocksSelect.mockResolvedValue({
      data: [],
    });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.isMerged).toBe(true);
    expect(mockLignePanierUpsert).not.toHaveBeenCalled();
  });

  it('supprime le panier guest et nettoie la session après fusion', async () => {
    setupAuthenticatedUser();

    mockGuestLinesSelect.mockResolvedValue({
      data: [],
    });

    const response = await POST(createMockRequest());
    const body = await response.json();

    expect(body.isMerged).toBe(true);
    expect(mockPanierDeleteEq).toHaveBeenCalledOnce();
    expect(mockClearCartSession).toHaveBeenCalledOnce();
  });
});
