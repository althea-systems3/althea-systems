import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockOrdersQuery = vi.fn();
const mockInvoicesQuery = vi.fn();

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
            eq: () => mockOrdersQuery(),
          }),
        };
      }

      if (table === 'facture') {
        return {
          select: () => ({
            in: () => ({
              order: () => ({
                range: () => mockInvoicesQuery(),
              }),
            }),
          }),
        };
      }

      return {};
    },
  }),
}));

// --- Import après mocks ---

import { GET } from '@/app/api/account/invoices/route';
import { NextRequest } from 'next/server';

// --- Helpers ---

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/account/invoices');

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return new NextRequest(url);
}

// --- Tests ---

describe('GET /api/account/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('retourne liste vide si aucune commande', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockOrdersQuery.mockResolvedValue({
      data: [],
      error: null,
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.invoices).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it('retourne les factures avec pagination', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockOrdersQuery.mockResolvedValue({
      data: [
        { id_commande: 'order-001', numero_commande: 'CMD-1001' },
      ],
      error: null,
    });

    mockInvoicesQuery.mockResolvedValue({
      data: [
        {
          id_facture: 'inv-001',
          numero_facture: 'FAC-1001',
          id_commande: 'order-001',
          date_emission: '2026-01-15T10:00:00.000Z',
          montant_ttc: 120,
          statut: 'payee',
          pdf_url: 'https://example.com/invoice.pdf',
        },
      ],
      error: null,
      count: 1,
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.invoices).toHaveLength(1);
    expect(body.invoices[0].invoiceNumber).toBe('FAC-1001');
    expect(body.invoices[0].orderNumber).toBe('CMD-1001');
    expect(body.invoices[0].totalTtc).toBe(120);
    expect(body.invoices[0].pdfUrl).toBe('https://example.com/invoice.pdf');
    expect(body.pagination).toEqual({
      limit: 10,
      offset: 0,
      total: 1,
    });
  });
});
