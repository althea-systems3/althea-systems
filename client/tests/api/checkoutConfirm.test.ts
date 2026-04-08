import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockGetCartSessionId = vi.fn();
const mockClearCartSession = vi.fn();
const mockCartSingle = vi.fn();
const mockCartLinesSelect = vi.fn();
const mockCartLinesDelete = vi.fn();
const mockInsertOrderSingle = vi.fn();
const mockInsertOrderLines = vi.fn();
const mockInsertStatusHistory = vi.fn();
const mockInsertInvoice = vi.fn();
const mockInsertAddress = vi.fn();
const mockSelectAddressSingle = vi.fn();
const mockSelectUserSingle = vi.fn();
const mockProductSelect = vi.fn();
const mockProductUpdate = vi.fn();
const mockStripeRetrieve = vi.fn();
const mockCreateUser = vi.fn();
const mockUserUpdate = vi.fn();
const mockGenerateInvoicePdf = vi.fn();
const mockSendEmail = vi.fn();
const mockLogActivity = vi.fn();
const mockFirebaseBucketSave = vi.fn();
const mockFirebaseBucketMakePublic = vi.fn();
const mockFirebaseBucketPublicUrl = vi.fn();

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
  clearCartSession: () => mockClearCartSession(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        createUser: (params: unknown) => mockCreateUser(params),
      },
    },
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

      if (table === 'ligne_panier') {
        return {
          select: () => ({
            eq: () => mockCartLinesSelect(),
          }),
          delete: () => ({
            eq: () => mockCartLinesDelete(),
          }),
        };
      }

      if (table === 'commande') {
        return {
          insert: () => ({
            select: () => ({
              single: () => mockInsertOrderSingle(),
            }),
          }),
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  single: () => ({ data: null }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'ligne_commande') {
        return {
          insert: () => mockInsertOrderLines(),
        };
      }

      if (table === 'historique_statut') {
        return {
          insert: () => mockInsertStatusHistory(),
        };
      }

      if (table === 'facture') {
        return {
          insert: () => mockInsertInvoice(),
        };
      }

      if (table === 'adresse') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => mockSelectAddressSingle(),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => mockInsertAddress(),
            }),
          }),
        };
      }

      if (table === 'utilisateur') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => mockSelectUserSingle(),
              }),
            }),
          }),
          update: () => ({
            eq: () => mockUserUpdate(),
          }),
        };
      }

      if (table === 'produit') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockProductSelect(),
            }),
          }),
          update: () => ({
            eq: () => mockProductUpdate(),
          }),
        };
      }

      return {};
    },
  }),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: () => ({
    paymentIntents: {
      retrieve: (id: string) => mockStripeRetrieve(id),
    },
  }),
}));

vi.mock('@/lib/checkout/pdf', () => ({
  generateInvoicePdf: (data: unknown) => mockGenerateInvoicePdf(data),
}));

vi.mock('@/lib/checkout/email', () => ({
  sendOrderConfirmationEmail: (data: unknown) => mockSendEmail(data),
}));

vi.mock('@/lib/checkout/logCheckoutActivity', () => ({
  logCheckoutActivity: (action: string, details: unknown) =>
    mockLogActivity(action, details),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getFirestoreClient: () => ({ firestore: {} }),
}));

vi.mock('firebase-admin', () => ({
  default: {
    storage: () => ({
      bucket: () => ({
        file: () => ({
          save: (...args: unknown[]) => mockFirebaseBucketSave(...args),
          makePublic: () => mockFirebaseBucketMakePublic(),
          publicUrl: () => mockFirebaseBucketPublicUrl(),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/checkout/numberGenerator', () => ({
  buildOrderNumber: () => 'ALT-202604-TESTTEST',
  buildInvoiceNumber: () => 'FAC-202604-TESTTEST',
}));

vi.mock('@/lib/checkout/currency', () => ({
  roundCurrency: (value: number) => Math.round(value * 100) / 100,
}));

vi.mock('@/lib/checkout/constants', () => ({
  ORDER_STATUS_PENDING: 'en_attente',
  ORDER_STATUS_IN_PROGRESS: 'en_cours',
  PAYMENT_STATUS_PENDING: 'en_attente',
  PAYMENT_STATUS_VALID: 'valide',
  PAYMENT_STATUS_FAILED: 'echoue',
  INVOICE_STATUS_PAID: 'payee',
  INVOICES_STORAGE_PATH: 'invoices',
  GUEST_USER_DEFAULT_STATUS: 'actif',
  GUEST_USER_DEFAULT_NAME: 'Invité',
}));

// --- Import après mocks ---

import { POST } from '@/app/api/checkout/confirm/route';

// --- Helpers ---

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/checkout/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_ADDRESS = {
  firstName: 'Jean',
  lastName: 'Dupont',
  address1: '10 rue de la Paix',
  city: 'Paris',
  postalCode: '75001',
  country: 'France',
  phone: '0612345678',
};

const VALID_CART_LINE = {
  id_ligne_panier: 'line-001',
  id_produit: 'prod-001',
  quantite: 2,
  produit: {
    nom: 'Produit Test',
    slug: 'produit-test',
    prix_ht: 8.33,
    prix_ttc: 10.0,
    quantite_stock: 10,
    statut: 'publie',
  },
};

// --- Tests ---

describe('POST /api/checkout/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Defaults for happy path
    mockInsertOrderLines.mockResolvedValue({ error: null });
    mockInsertStatusHistory.mockResolvedValue({ error: null });
    mockInsertInvoice.mockResolvedValue({ error: null });
    mockCartLinesDelete.mockResolvedValue({ error: null });
    mockClearCartSession.mockResolvedValue(undefined);
    mockProductSelect.mockResolvedValue({
      data: { quantite_stock: 10 },
    });
    mockProductUpdate.mockResolvedValue({ error: null });
    mockGenerateInvoicePdf.mockResolvedValue(Buffer.from('fake-pdf'));
    mockFirebaseBucketSave.mockResolvedValue(undefined);
    mockFirebaseBucketMakePublic.mockResolvedValue(undefined);
    mockFirebaseBucketPublicUrl.mockReturnValue('https://storage.example.com/invoices/test.pdf');
    mockSendEmail.mockResolvedValue(undefined);
    mockLogActivity.mockResolvedValue(undefined);
    mockUserUpdate.mockResolvedValue({ error: null });
  });

  it('retourne 400 si paymentIntentId manquant', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@test.com' } },
    });

    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('paymentIntentId requis');
  });

  it('retourne 400 si utilisateur non connecté et pas d\'email guest', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const response = await POST(
      createRequest({ paymentIntentId: 'pi_test_123' }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Email invité requis pour finaliser la commande');
  });

  it('retourne 402 si paiement Stripe échoué', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@test.com' } },
    });

    mockStripeRetrieve.mockResolvedValue({
      status: 'requires_payment_method',
      metadata: {},
    });

    // Idempotency check — no existing cart lines means check for existing order
    mockCartLinesSelect.mockResolvedValue({ data: [{ id_ligne_panier: 'x' }] });

    const response = await POST(
      createRequest({
        paymentIntentId: 'pi_test_failed',
        address: VALID_ADDRESS,
      }),
    );

    expect(response.status).toBe(402);
    const body = await response.json();
    expect(body.code).toBe('payment_failed');
  });

  it('retourne 400 si panier introuvable', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@test.com' } },
    });

    mockStripeRetrieve.mockResolvedValue({
      status: 'succeeded',
      metadata: { cartId: 'cart-001', userId: 'user-001' },
    });

    // Idempotency — cart lines exist
    mockCartLinesSelect.mockResolvedValue({
      data: [{ id_ligne_panier: 'x' }],
    });

    // resolveCartId — no cart found
    mockCartSingle.mockResolvedValue({ data: null });

    const response = await POST(
      createRequest({
        paymentIntentId: 'pi_test_ok',
        address: VALID_ADDRESS,
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Panier introuvable');
  });

  it('retourne 409 si stock insuffisant', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@test.com' } },
    });

    mockStripeRetrieve.mockResolvedValue({
      status: 'succeeded',
      metadata: { cartId: 'cart-001', userId: 'user-001' },
    });

    mockCartLinesSelect
      .mockResolvedValueOnce({ data: [{ id_ligne_panier: 'x' }] }) // idempotency
      .mockResolvedValueOnce({
        data: [
          {
            ...VALID_CART_LINE,
            quantite: 50,
            produit: { ...VALID_CART_LINE.produit, quantite_stock: 3 },
          },
        ],
        error: null,
      }); // fetchCartLines

    mockCartSingle.mockResolvedValue({
      data: { id_panier: 'cart-001' },
    });

    const response = await POST(
      createRequest({
        paymentIntentId: 'pi_test_stock',
        address: VALID_ADDRESS,
      }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('stock_conflict');
  });

  it('retourne 201 avec commande créée en cas de succès', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'user@test.com' } },
    });

    mockStripeRetrieve.mockResolvedValue({
      status: 'succeeded',
      metadata: { cartId: 'cart-001', userId: 'user-001' },
    });

    // Idempotency — cart lines exist (not already processed)
    mockCartLinesSelect
      .mockResolvedValueOnce({ data: [{ id_ligne_panier: 'x' }] })
      .mockResolvedValueOnce({
        data: [VALID_CART_LINE],
        error: null,
      });

    mockCartSingle.mockResolvedValue({
      data: { id_panier: 'cart-001' },
    });

    // Resolve address (saved)
    mockSelectAddressSingle.mockResolvedValue({ data: null });
    mockInsertAddress.mockResolvedValue({
      data: { id_adresse: 'addr-001' },
      error: null,
    });

    // Insert order
    mockInsertOrderSingle.mockResolvedValue({
      data: { id_commande: 'order-001' },
      error: null,
    });

    const response = await POST(
      createRequest({
        paymentIntentId: 'pi_test_success',
        address: VALID_ADDRESS,
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.orderId).toBe('order-001');
    expect(body.orderNumber).toBe('ALT-202604-TESTTEST');
    expect(body.status).toBe('confirmed');
    expect(body.summary.totalTtc).toBe(20);
  });

  it('crée un utilisateur guest si non connecté avec email', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    mockStripeRetrieve.mockResolvedValue({
      status: 'succeeded',
      metadata: { cartId: 'cart-001' },
    });

    // Idempotency — cart lines exist
    mockCartLinesSelect
      .mockResolvedValueOnce({ data: [{ id_ligne_panier: 'x' }] })
      .mockResolvedValueOnce({
        data: [VALID_CART_LINE],
        error: null,
      });

    // Guest user — no existing user
    mockSelectUserSingle.mockResolvedValue({ data: null });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'guest-001' } },
      error: null,
    });

    // Resolve cart via session
    mockGetCartSessionId.mockResolvedValue('session-xyz');
    mockCartSingle.mockResolvedValue({
      data: { id_panier: 'cart-001' },
    });

    // Address
    mockInsertAddress.mockResolvedValue({
      data: { id_adresse: 'addr-002' },
      error: null,
    });

    // Order
    mockInsertOrderSingle.mockResolvedValue({
      data: { id_commande: 'order-002' },
      error: null,
    });

    const response = await POST(
      createRequest({
        paymentIntentId: 'pi_test_guest',
        guestEmail: 'guest@example.com',
        address: VALID_ADDRESS,
      }),
    );

    expect(response.status).toBe(201);
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'guest@example.com' }),
    );
  });
});
