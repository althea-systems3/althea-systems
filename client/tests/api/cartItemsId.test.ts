import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockGetCartSessionId = vi.fn();
const mockCartSingle = vi.fn();
const mockLineSingle = vi.fn();
const mockProductSingle = vi.fn();
const mockUpdateSingle = vi.fn();
const mockDeleteEq = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({}),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock('@/lib/auth/cartSession', () => ({
  getCartSessionId: () => mockGetCartSessionId(),
}));

vi.mock('@/lib/products/constants', () => ({
  MAX_QUANTITY_PER_LINE: 99,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'panier') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => mockCartSingle(),
              }),
            }),
          }),
        };
      }

      if (table === 'produit') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => mockProductSingle(),
              }),
            }),
          }),
        };
      }

      // table === 'ligne_panier'
      return {
        select: () => ({
          eq: () => ({
            single: () => mockLineSingle(),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => mockUpdateSingle(),
            }),
          }),
        }),
        delete: () => ({
          eq: () => mockDeleteEq(),
        }),
      };
    },
  }),
}));

// --- Import après mocks ---

import { PATCH, DELETE } from '@/app/api/cart/items/[id]/route';

// --- Helpers ---

function createPatchRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/cart/items/line-001', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(): Request {
  return new Request('http://localhost:3000/api/cart/items/line-001', {
    method: 'DELETE',
  });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function setupAuthMocks() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-001' } } });
  mockCartSingle.mockResolvedValue({
    data: { id_panier: 'cart-001' },
  });
}

// --- Tests PATCH ---

describe('PATCH /api/cart/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 400 si quantite est invalide', async () => {
    const response = await PATCH(
      createPatchRequest({ quantite: -1 }),
      createParams('line-001'),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('quantite');
  });

  it('retourne 404 si la ligne n appartient pas au panier', async () => {
    setupAuthMocks();

    mockLineSingle.mockResolvedValue({
      data: {
        id_ligne_panier: 'line-001',
        id_panier: 'cart-other',
        id_produit: 'prod-001',
        quantite: 2,
      },
    });

    const response = await PATCH(
      createPatchRequest({ quantite: 3 }),
      createParams('line-001'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne 400 si stock insuffisant', async () => {
    setupAuthMocks();

    mockLineSingle.mockResolvedValue({
      data: {
        id_ligne_panier: 'line-001',
        id_panier: 'cart-001',
        id_produit: 'prod-001',
        quantite: 2,
      },
    });

    mockProductSingle.mockResolvedValue({
      data: { quantite_stock: 3 },
    });

    const response = await PATCH(
      createPatchRequest({ quantite: 10 }),
      createParams('line-001'),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Stock insuffisant');
    expect(body.availableStock).toBe(3);
  });

  it('retourne 200 avec la ligne mise à jour', async () => {
    setupAuthMocks();

    mockLineSingle.mockResolvedValue({
      data: {
        id_ligne_panier: 'line-001',
        id_panier: 'cart-001',
        id_produit: 'prod-001',
        quantite: 2,
      },
    });

    mockProductSingle.mockResolvedValue({
      data: { quantite_stock: 12 },
    });

    mockUpdateSingle.mockResolvedValue({
      data: {
        id_ligne_panier: 'line-001',
        id_panier: 'cart-001',
        id_produit: 'prod-001',
        quantite: 5,
      },
      error: null,
    });

    const response = await PATCH(
      createPatchRequest({ quantite: 5 }),
      createParams('line-001'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cartLine.quantite).toBe(5);
  });

  it('supprime la ligne si quantite vaut 0', async () => {
    setupAuthMocks();

    mockLineSingle.mockResolvedValue({
      data: {
        id_ligne_panier: 'line-001',
        id_panier: 'cart-001',
        id_produit: 'prod-001',
        quantite: 2,
      },
    });

    mockDeleteEq.mockResolvedValue({ error: null });

    const response = await PATCH(
      createPatchRequest({ quantite: 0 }),
      createParams('line-001'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });
});

// --- Tests DELETE ---

describe('DELETE /api/cart/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 404 si la ligne est introuvable', async () => {
    setupAuthMocks();

    mockLineSingle.mockResolvedValue({ data: null });

    const response = await DELETE(
      createDeleteRequest(),
      createParams('line-inexistant'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne 200 et supprime la ligne', async () => {
    setupAuthMocks();

    mockLineSingle.mockResolvedValue({
      data: {
        id_ligne_panier: 'line-001',
        id_panier: 'cart-001',
        id_produit: 'prod-001',
        quantite: 2,
      },
    });

    mockDeleteEq.mockResolvedValue({ error: null });

    const response = await DELETE(
      createDeleteRequest(),
      createParams('line-001'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });
});
