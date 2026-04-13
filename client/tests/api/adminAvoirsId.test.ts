import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();

const mockCreditNoteSelectQuery = vi.fn();
const mockInvoiceSelectQuery = vi.fn();
const mockOrderSelectQuery = vi.fn();
const mockUserSelectQuery = vi.fn();

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
  chain.select = () => chain;
  chain.single = () => Promise.resolve(resolveFn()).then((v) => v);
  chain.then = (resolve: (v: unknown) => unknown) => {
    return Promise.resolve(resolveFn()).then(resolve);
  };

  return chain;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'avoir') {
        return {
          select: () =>
            createChainableQuery(() => mockCreditNoteSelectQuery()),
        };
      }
      if (table === 'facture') {
        return {
          select: () =>
            createChainableQuery(() => mockInvoiceSelectQuery()),
        };
      }
      if (table === 'commande') {
        return {
          select: () =>
            createChainableQuery(() => mockOrderSelectQuery()),
        };
      }
      if (table === 'utilisateur') {
        return {
          select: () =>
            createChainableQuery(() => mockUserSelectQuery()),
        };
      }
      return {
        select: () => createChainableQuery(() => ({ data: null, error: null })),
      };
    },
  }),
}));

import { GET } from '@/app/api/admin/avoirs/[id]/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(): Request {
  return new Request('http://localhost/api/admin/avoirs/av-1', {
    method: 'GET',
  });
}

const fakeCreditNote = {
  id_avoir: 'av-1',
  numero_avoir: 'AVO-202604-TESTTEST',
  id_facture: 'inv-1',
  date_emission: '2026-04-01T14:00:00Z',
  montant: 149.99,
  motif: 'annulation',
  pdf_url: '/invoices/av-1.pdf',
};

const fakeInvoice = {
  id_facture: 'inv-1',
  numero_facture: 'FAC-202603-ABCDEFGH',
  id_commande: 'order-1',
  date_emission: '2026-03-01T12:00:00Z',
  montant_ttc: 149.99,
  statut: 'payee',
  pdf_url: '/invoices/inv-1.pdf',
};

const fakeOrder = {
  id_commande: 'order-1',
  numero_commande: 'CMD-2026-00001',
  id_utilisateur: 'user-1',
  date_commande: '2026-03-01T10:00:00Z',
  statut: 'terminee',
  statut_paiement: 'valide',
};

const fakeUser = {
  id_utilisateur: 'user-1',
  nom_complet: 'Alice Dupont',
  email: 'alice@example.com',
};

// --- Tests ---

describe('GET /api/admin/avoirs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockCreditNoteSelectQuery.mockReturnValue({
      data: fakeCreditNote,
      error: null,
    });
    mockInvoiceSelectQuery.mockReturnValue({
      data: fakeInvoice,
      error: null,
    });
    mockOrderSelectQuery.mockReturnValue({
      data: fakeOrder,
      error: null,
    });
    mockUserSelectQuery.mockReturnValue({
      data: fakeUser,
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

    const response = await GET(createRequest(), createRouteContext('av-1'));

    expect(response.status).toBe(401);
  });

  it('retourne 400 si id vide', async () => {
    const response = await GET(createRequest(), createRouteContext(''));

    expect(response.status).toBe(400);
  });

  it('retourne 404 si avoir introuvable', async () => {
    mockCreditNoteSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await GET(
      createRequest(),
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne le détail complet avec facture, commande et client', async () => {
    const response = await GET(createRequest(), createRouteContext('av-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.creditNote.numero_avoir).toBe('AVO-202604-TESTTEST');
    expect(body.creditNote.montant).toBe(149.99);
    expect(body.invoice.numero_facture).toBe('FAC-202603-ABCDEFGH');
    expect(body.order.numero_commande).toBe('CMD-2026-00001');
    expect(body.client.nom_complet).toBe('Alice Dupont');
  });
});
