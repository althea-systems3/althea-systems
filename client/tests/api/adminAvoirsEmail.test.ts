import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockSendCreditNoteResendEmail = vi.fn();

const mockCreditNoteSelectQuery = vi.fn();
const mockInvoiceSelectQuery = vi.fn();
const mockOrderSelectQuery = vi.fn();
const mockUserSelectQuery = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/firebase/logActivity', () => ({
  logAdminActivity: (...args: unknown[]) => mockLogAdminActivity(...args),
}));

vi.mock('@/lib/checkout/email', () => ({
  sendCreditNoteResendEmail: (...args: unknown[]) =>
    mockSendCreditNoteResendEmail(...args),
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

import { POST } from '@/app/api/admin/avoirs/[id]/email/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createPostRequest(): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/avoirs/av-1/email',
    { method: 'POST' },
  );
}

// --- Tests ---

describe('POST /api/admin/avoirs/[id]/email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockSendCreditNoteResendEmail.mockResolvedValue(undefined);
    mockCreditNoteSelectQuery.mockReturnValue({
      data: {
        id_avoir: 'av-1',
        numero_avoir: 'AVO-202604-TESTTEST',
        id_facture: 'inv-1',
        date_emission: '2026-04-01T14:00:00Z',
        montant: 149.99,
        motif: 'annulation',
        pdf_url: '/invoices/av-1.pdf',
      },
      error: null,
    });
    mockInvoiceSelectQuery.mockReturnValue({
      data: {
        id_facture: 'inv-1',
        numero_facture: 'FAC-202603-ABCDEFGH',
        id_commande: 'order-1',
      },
      error: null,
    });
    mockOrderSelectQuery.mockReturnValue({
      data: {
        id_commande: 'order-1',
        numero_commande: 'CMD-2026-00001',
        id_utilisateur: 'user-1',
      },
      error: null,
    });
    mockUserSelectQuery.mockReturnValue({
      data: {
        id_utilisateur: 'user-1',
        nom_complet: 'Alice Dupont',
        email: 'alice@example.com',
      },
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

    const response = await POST(
      createPostRequest(),
      createRouteContext('av-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 404 si avoir introuvable', async () => {
    mockCreditNoteSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await POST(
      createPostRequest(),
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('envoie l email avec succès et log', async () => {
    const response = await POST(
      createPostRequest(),
      createRouteContext('av-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSendCreditNoteResendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'alice@example.com',
        creditNoteNumber: 'AVO-202604-TESTTEST',
        invoiceNumber: 'FAC-202603-ABCDEFGH',
      }),
    );
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'credit_notes.send_email',
      expect.objectContaining({ creditNoteId: 'av-1' }),
    );
  });
});
