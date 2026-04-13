import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockGenerateCreditNotePdf = vi.fn();
const mockBuildCreditNoteNumber = vi.fn();

const mockInvoiceSelectQuery = vi.fn();
const mockInvoiceUpdateQuery = vi.fn();
const mockOrderSelectQuery = vi.fn();
const mockUserSelectQuery = vi.fn();
const mockCreditNoteSelectQuery = vi.fn();
const mockCreditNoteInsertQuery = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/firebase/logActivity', () => ({
  logAdminActivity: (...args: unknown[]) => mockLogAdminActivity(...args),
}));

vi.mock('@/lib/checkout/pdf', () => ({
  generateCreditNotePdf: (...args: unknown[]) =>
    mockGenerateCreditNotePdf(...args),
}));

vi.mock('@/lib/checkout/numberGenerator', () => ({
  buildCreditNoteNumber: () => mockBuildCreditNoteNumber(),
}));

vi.mock('@/lib/checkout/constants', () => ({
  CREDIT_NOTE_REASON_CANCELLATION: 'annulation',
  INVOICES_STORAGE_PATH: 'invoices',
}));

vi.mock('firebase-admin', () => ({
  default: {
    storage: () => ({
      bucket: () => ({
        file: () => ({
          save: vi.fn().mockResolvedValue(undefined),
          makePublic: vi.fn().mockResolvedValue(undefined),
          publicUrl: () => 'https://storage.example.com/invoices/AVO-test.pdf',
        }),
      }),
    }),
  },
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
  chain.order = self;
  chain.limit = self;
  chain.select = () => chain;
  chain.single = () => Promise.resolve(resolveFn()).then((v) => v);
  chain.maybeSingle = () => Promise.resolve(resolveFn()).then((v) => v);
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
          select: () =>
            createChainableQuery(() => mockInvoiceSelectQuery()),
          update: () =>
            createChainableQuery(() => mockInvoiceUpdateQuery()),
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
      if (table === 'avoir') {
        return {
          select: () =>
            createChainableQuery(() => mockCreditNoteSelectQuery()),
          insert: () =>
            Promise.resolve(mockCreditNoteInsertQuery()).then((v) => v),
        };
      }
      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
  }),
}));

import {
  GET,
  PATCH,
  DELETE,
} from '@/app/api/admin/invoices/[id]/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(
  method: string,
  body?: Record<string, unknown>,
): Request | NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  if (method === 'DELETE') {
    return new NextRequest(
      'http://localhost/api/admin/invoices/inv-1',
      init,
    );
  }
  return new Request('http://localhost/api/admin/invoices/inv-1', init);
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

// --- Tests GET ---

describe('GET /api/admin/invoices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
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
    mockCreditNoteSelectQuery.mockReturnValue({
      data: null,
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

    const response = await GET(
      createRequest('GET') as Request,
      createRouteContext('inv-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si id vide', async () => {
    const response = await GET(
      createRequest('GET') as Request,
      createRouteContext(''),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 404 si facture introuvable', async () => {
    mockInvoiceSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await GET(
      createRequest('GET') as Request,
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne le détail complet', async () => {
    const response = await GET(
      createRequest('GET') as Request,
      createRouteContext('inv-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoice.numero_facture).toBe('FAC-202603-ABCDEFGH');
    expect(body.invoice.commande.numero_commande).toBe('CMD-2026-00001');
    expect(body.invoice.client.nom_complet).toBe('Alice Dupont');
    expect(body.history).toBeDefined();
  });
});

// --- Tests PATCH ---

describe('PATCH /api/admin/invoices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockInvoiceSelectQuery.mockReturnValue({
      data: fakeInvoice,
      error: null,
    });
    mockInvoiceUpdateQuery.mockReturnValue({
      data: { ...fakeInvoice, statut: 'en_attente' },
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
    mockCreditNoteSelectQuery.mockReturnValue({
      data: null,
      error: null,
    });
  });

  it('retourne 400 si statut invalide', async () => {
    const response = await PATCH(
      createRequest('PATCH', { statut: 'invalid' }) as Request,
      createRouteContext('inv-1'),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 404 si facture introuvable', async () => {
    mockInvoiceSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await PATCH(
      createRequest('PATCH', { statut: 'en_attente' }) as Request,
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('modifie le statut avec succès et log', async () => {
    const response = await PATCH(
      createRequest('PATCH', { statut: 'en_attente' }) as Request,
      createRouteContext('inv-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoice.statut).toBe('en_attente');
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'invoices.update',
      expect.objectContaining({
        invoiceId: 'inv-1',
        previousStatus: 'payee',
        nextStatus: 'en_attente',
      }),
    );
  });
});

// --- Tests DELETE ---

describe('DELETE /api/admin/invoices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
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
    // No existing credit note
    mockCreditNoteSelectQuery.mockReturnValue({
      data: [],
      error: null,
    });
    mockCreditNoteInsertQuery.mockReturnValue({ error: null });
    mockInvoiceUpdateQuery.mockReturnValue({ error: null });
    mockBuildCreditNoteNumber.mockReturnValue('AVO-202604-TESTTEST');
    mockGenerateCreditNotePdf.mockResolvedValue(Buffer.from('pdf'));
  });

  it('retourne 404 si facture introuvable', async () => {
    mockInvoiceSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await DELETE(
      createRequest('DELETE') as NextRequest,
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('supprime avec création avoir automatique', async () => {
    const response = await DELETE(
      createRequest('DELETE') as NextRequest,
      createRouteContext('inv-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.creditNote.number).toBe('AVO-202604-TESTTEST');
    expect(body.creditNote.amount).toBe(149.99);
  });
});
