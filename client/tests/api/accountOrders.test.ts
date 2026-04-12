import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockOrdersQuery = vi.fn();
const mockInvoicesQuery = vi.fn();
const mockOrderLinesQuery = vi.fn();
const mockProductsQuery = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: () => null,
      set: vi.fn(),
      delete: vi.fn(),
      getAll: () => [],
    }),
  ),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'commande') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: () => mockOrdersQuery(),
              }),
            }),
          }),
        };
      }

      if (table === 'ligne_commande') {
        return {
          select: () => ({
            in: () => mockOrderLinesQuery(),
          }),
        };
      }

      if (table === 'produit') {
        return {
          select: () => ({
            in: () => mockProductsQuery(),
          }),
        };
      }

      if (table === 'facture') {
        return {
          select: () => ({
            in: () => mockInvoicesQuery(),
          }),
        };
      }

      return {};
    },
  }),
}));

// --- Import après mocks ---

import { GET } from '@/app/api/account/orders/route';
import { NextRequest } from 'next/server';

// --- Helpers ---

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/account/orders');

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return new NextRequest(url);
}

// --- Tests ---

describe('GET /api/account/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockOrderLinesQuery.mockResolvedValue({
      data: [],
      error: null,
    });

    mockProductsQuery.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it('retourne 401 si utilisateur non authentifie', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not auth' },
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('session_expired');
  });

  it('retourne les commandes avec facture et pagination', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockOrdersQuery.mockResolvedValue({
      data: [
        {
          id_commande: 'order-001',
          numero_commande: 'CMD-1001',
          date_commande: '2026-01-01T10:00:00.000Z',
          montant_ttc: 120,
          statut: 'terminee',
          statut_paiement: 'valide',
        },
      ],
      error: null,
      count: 1,
    });

    mockInvoicesQuery.mockResolvedValue({
      data: [
        {
          id_commande: 'order-001',
          numero_facture: 'FAC-1001',
          statut: 'payee',
          pdf_url: 'https://example.com/invoice.pdf',
        },
      ],
      error: null,
    });

    mockOrderLinesQuery.mockResolvedValue({
      data: [
        {
          id_commande: 'order-001',
          id_produit: 'prod-001',
        },
        {
          id_commande: 'order-001',
          id_produit: 'prod-002',
        },
      ],
      error: null,
    });

    mockProductsQuery.mockResolvedValue({
      data: [
        {
          id_produit: 'prod-001',
          nom: 'Routeur Pro',
        },
        {
          id_produit: 'prod-002',
          nom: 'Switch 24 ports',
        },
      ],
      error: null,
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0].orderNumber).toBe('CMD-1001');
    expect(body.orders[0].invoice.invoiceNumber).toBe('FAC-1001');
    expect(body.orders[0].orderType).toBe('multi_produits');
    expect(body.orders[0].productCount).toBe(2);
    expect(body.orders[0].productNames).toEqual([
      'Routeur Pro',
      'Switch 24 ports',
    ]);
    expect(body.pagination).toEqual({
      limit: 10,
      offset: 0,
      total: 1,
    });
  });

  it('respecte les parametres de pagination', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockOrdersQuery.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    });

    const response = await GET(createGetRequest({ limit: '5', offset: '10' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pagination).toEqual({
      limit: 5,
      offset: 10,
      total: 0,
    });
  });
});
