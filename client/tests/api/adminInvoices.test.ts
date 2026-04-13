import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();

const mockInvoicesSelectQuery = vi.fn();
const mockOrdersSelectQuery = vi.fn();
const mockUsersSelectQuery = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/admin/common', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual };
});

function createChainableQuery(resolveFn: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.eq = self;
  chain.in = self;
  chain.ilike = self;
  chain.gte = self;
  chain.lte = self;
  chain.or = self;
  chain.not = self;
  chain.order = self;
  chain.range = self;
  chain.limit = self;
  chain.select = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => {
    return Promise.resolve(resolveFn()).then(resolve);
  };

  return chain;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'facture') {
        return {
          select: () => createChainableQuery(() => mockInvoicesSelectQuery()),
        };
      }
      if (table === 'commande') {
        return {
          select: () => createChainableQuery(() => mockOrdersSelectQuery()),
        };
      }
      if (table === 'utilisateur') {
        return {
          select: () => createChainableQuery(() => mockUsersSelectQuery()),
        };
      }
      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
  }),
}));

import { GET } from '@/app/api/admin/invoices/route';

// --- Helpers ---

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/invoices');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url.toString(), { method: 'GET' });
}

const fakeInvoice = {
  id_facture: 'inv-1',
  numero_facture: 'FAC-202603-ABCDEFGH',
  id_commande: 'order-1',
  date_emission: '2026-03-01T12:00:00Z',
  montant_ttc: 149.99,
  statut: 'payee',
  pdf_url: '/invoices/inv-1.pdf',
};

// --- Tests ---

describe('GET /api/admin/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockInvoicesSelectQuery.mockReturnValue({
      data: [fakeInvoice],
      error: null,
      count: 1,
    });
    mockOrdersSelectQuery.mockReturnValue({
      data: [
        {
          id_commande: 'order-1',
          numero_commande: 'CMD-2026-00001',
          id_utilisateur: 'user-1',
        },
      ],
      error: null,
    });
    mockUsersSelectQuery.mockReturnValue({
      data: [
        {
          id_utilisateur: 'user-1',
          nom_complet: 'Alice Dupont',
          email: 'alice@example.com',
        },
      ],
      error: null,
    });
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await GET(createGetRequest());

    expect(response.status).toBe(401);
  });

  it('retourne la liste paginée avec commande et client', async () => {
    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoices).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);

    const invoice = body.invoices[0];
    expect(invoice.numero_facture).toBe('FAC-202603-ABCDEFGH');
    expect(invoice.commande.numero_commande).toBe('CMD-2026-00001');
    expect(invoice.client.nom_complet).toBe('Alice Dupont');
  });

  it('filtre par statut', async () => {
    const response = await GET(createGetRequest({ status: 'payee' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoices).toHaveLength(1);
  });

  it('retourne 500 si erreur base de données', async () => {
    mockInvoicesSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'connection failed' },
      count: null,
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
  });
});
