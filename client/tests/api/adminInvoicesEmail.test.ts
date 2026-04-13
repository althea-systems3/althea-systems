import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockSendInvoiceResendEmail = vi.fn();

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
  sendInvoiceResendEmail: (...args: unknown[]) =>
    mockSendInvoiceResendEmail(...args),
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

import { POST } from '@/app/api/admin/invoices/[id]/email/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createPostRequest(): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/invoices/inv-1/email',
    { method: 'POST' },
  );
}

// --- Tests ---

describe('POST /api/admin/invoices/[id]/email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockSendInvoiceResendEmail.mockResolvedValue(undefined);
    mockInvoiceSelectQuery.mockReturnValue({
      data: {
        id_facture: 'inv-1',
        numero_facture: 'FAC-202603-ABCDEFGH',
        id_commande: 'order-1',
        date_emission: '2026-03-01T12:00:00Z',
        montant_ttc: 149.99,
        pdf_url: '/invoices/inv-1.pdf',
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
      createRouteContext('inv-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 404 si facture introuvable', async () => {
    mockInvoiceSelectQuery.mockReturnValue({
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
      createRouteContext('inv-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSendInvoiceResendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'alice@example.com',
        invoiceNumber: 'FAC-202603-ABCDEFGH',
      }),
    );
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'invoices.send_email',
      expect.objectContaining({ invoiceId: 'inv-1' }),
    );
  });
});
