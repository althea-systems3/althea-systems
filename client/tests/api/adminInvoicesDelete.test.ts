import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockSelectInvoiceSingle = vi.fn();
const mockSelectAvoirLimit = vi.fn();
const mockSelectOrderSingle = vi.fn();
const mockSelectUserSingle = vi.fn();
const mockInsertAvoir = vi.fn();
const mockUpdateInvoice = vi.fn();
const mockGenerateCreditNotePdf = vi.fn();
const mockFirebaseSave = vi.fn();
const mockFirebaseMakePublic = vi.fn();
const mockFirebasePublicUrl = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/firebase/logActivity', () => ({
  logAdminActivity: (...args: unknown[]) => mockLogAdminActivity(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'facture') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockSelectInvoiceSingle(),
            }),
          }),
          update: () => ({
            eq: () => mockUpdateInvoice(),
          }),
        };
      }

      if (table === 'avoir') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => mockSelectAvoirLimit(),
            }),
          }),
          insert: () => mockInsertAvoir(),
        };
      }

      if (table === 'commande') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockSelectOrderSingle(),
            }),
          }),
        };
      }

      if (table === 'utilisateur') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockSelectUserSingle(),
            }),
          }),
        };
      }

      return {};
    },
  }),
}));

vi.mock('@/lib/checkout/numberGenerator', () => ({
  buildCreditNoteNumber: () => 'AVO-202604-TESTTEST',
}));

vi.mock('@/lib/checkout/pdf', () => ({
  generateCreditNotePdf: (data: unknown) => mockGenerateCreditNotePdf(data),
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
          save: (...args: unknown[]) => mockFirebaseSave(...args),
          makePublic: () => mockFirebaseMakePublic(),
          publicUrl: () => mockFirebasePublicUrl(),
        }),
      }),
    }),
  },
}));

// --- Import après mocks ---

import { DELETE } from '@/app/api/admin/invoices/[id]/route';
import { NextRequest } from 'next/server';

// --- Helpers ---

function createDeleteRequest(): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/admin/invoices/inv-001',
    { method: 'DELETE' },
  );
}

function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const VALID_INVOICE = {
  id_facture: 'inv-001',
  numero_facture: 'FAC-202604-ABCDEFGH',
  id_commande: 'order-001',
  montant_ttc: 99.99,
  statut: 'payee',
  pdf_url: 'https://storage.example.com/invoices/FAC-202604-ABCDEFGH.pdf',
};

// --- Tests ---

describe('DELETE /api/admin/invoices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Defaults
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-001' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockGenerateCreditNotePdf.mockResolvedValue(Buffer.from('fake-pdf'));
    mockFirebaseSave.mockResolvedValue(undefined);
    mockFirebaseMakePublic.mockResolvedValue(undefined);
    mockFirebasePublicUrl.mockReturnValue(
      'https://storage.example.com/invoices/AVO-202604-TESTTEST.pdf',
    );
    mockUpdateInvoice.mockResolvedValue({ error: null });
  });

  it('retourne 401 si non authentifié', async () => {
    mockVerifyAdminAccess.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Authentification requise.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await DELETE(
      createDeleteRequest(),
      createContext('inv-001'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 404 si facture introuvable', async () => {
    mockSelectInvoiceSingle.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await DELETE(
      createDeleteRequest(),
      createContext('inv-unknown'),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Facture introuvable');
  });

  it('retourne 409 si un avoir existe déjà', async () => {
    mockSelectInvoiceSingle.mockResolvedValue({
      data: VALID_INVOICE,
      error: null,
    });

    mockSelectAvoirLimit.mockResolvedValue({
      data: [{ id_avoir: 'avo-existing' }],
    });

    const response = await DELETE(
      createDeleteRequest(),
      createContext('inv-001'),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('Un avoir existe déjà pour cette facture');
  });

  it('crée l\'avoir et annule la facture en cas de succès', async () => {
    mockSelectInvoiceSingle.mockResolvedValue({
      data: VALID_INVOICE,
      error: null,
    });

    mockSelectAvoirLimit.mockResolvedValue({ data: [] });

    mockSelectOrderSingle.mockResolvedValue({
      data: {
        id_commande: 'order-001',
        numero_commande: 'ALT-202604-ABCDEFGH',
        id_utilisateur: 'user-001',
      },
      error: null,
    });

    mockSelectUserSingle.mockResolvedValue({
      data: { nom_complet: 'Jean Dupont', email: 'jean@example.com' },
      error: null,
    });

    mockInsertAvoir.mockResolvedValue({ error: null });

    const response = await DELETE(
      createDeleteRequest(),
      createContext('inv-001'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.creditNote.number).toBe('AVO-202604-TESTTEST');
    expect(body.creditNote.amount).toBe(99.99);
    expect(body.message).toContain('avoir créé automatiquement');
  });

  it('génère le PDF et l\'upload vers Firebase', async () => {
    mockSelectInvoiceSingle.mockResolvedValue({
      data: VALID_INVOICE,
      error: null,
    });

    mockSelectAvoirLimit.mockResolvedValue({ data: [] });

    mockSelectOrderSingle.mockResolvedValue({
      data: {
        id_commande: 'order-001',
        numero_commande: 'ALT-202604-ABCDEFGH',
        id_utilisateur: 'user-001',
      },
      error: null,
    });

    mockSelectUserSingle.mockResolvedValue({
      data: { nom_complet: 'Jean Dupont', email: 'jean@example.com' },
      error: null,
    });

    mockInsertAvoir.mockResolvedValue({ error: null });

    const response = await DELETE(
      createDeleteRequest(),
      createContext('inv-001'),
    );

    expect(response.status).toBe(200);
    expect(mockGenerateCreditNotePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        creditNoteNumber: 'AVO-202604-TESTTEST',
        invoiceNumber: 'FAC-202604-ABCDEFGH',
        amount: 99.99,
        reason: 'annulation',
      }),
    );
    expect(mockFirebaseSave).toHaveBeenCalled();
  });

  it('retourne 500 si insertion avoir échoue', async () => {
    mockSelectInvoiceSingle.mockResolvedValue({
      data: VALID_INVOICE,
      error: null,
    });

    mockSelectAvoirLimit.mockResolvedValue({ data: [] });

    mockSelectOrderSingle.mockResolvedValue({
      data: {
        id_commande: 'order-001',
        numero_commande: 'ALT-202604-ABCDEFGH',
        id_utilisateur: 'user-001',
      },
      error: null,
    });

    mockSelectUserSingle.mockResolvedValue({
      data: { nom_complet: 'Jean Dupont', email: 'jean@example.com' },
      error: null,
    });

    mockInsertAvoir.mockResolvedValue({
      error: { message: 'insert failed' },
    });

    const response = await DELETE(
      createDeleteRequest(),
      createContext('inv-001'),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Impossible de créer l\'avoir');
  });
});
