import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockSelectOrder = vi.fn();
const mockInsertSingle = vi.fn();
const mockUpdateEq = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({}),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => mockSelectOrder(),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => mockInsertSingle(),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => mockUpdateEq(),
        }),
      }),
    }),
  }),
}));

// --- Import après mocks ---

import { GET, POST } from '@/app/api/checkout/payment-methods/route';

// --- Helpers ---

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/checkout/payment-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// --- Tests GET ---

describe('GET /api/checkout/payment-methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne liste vide si non authentifié', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not auth' },
    });

    const response = await GET();
    const body = await response.json();

    expect(body.paymentMethods).toEqual([]);
  });

  it('retourne les méthodes de paiement mappées', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });

    mockSelectOrder.mockResolvedValue({
      data: [
        {
          id_paiement: 'pm-001',
          nom_carte: 'Jean Dupont',
          derniers_4_chiffres: '4242',
          date_expiration: '12/27',
          est_defaut: true,
        },
      ],
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(body.paymentMethods).toHaveLength(1);
    expect(body.paymentMethods[0].cardHolder).toBe('Jean Dupont');
    expect(body.paymentMethods[0].last4).toBe('4242');
    expect(body.paymentMethods[0].isDefault).toBe(true);
  });
});

// --- Tests POST ---

describe('POST /api/checkout/payment-methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not auth' },
    });

    const response = await POST(
      createPostRequest({
        stripePaymentId: 'pm_test',
        cardHolder: 'Jean',
        last4: '4242',
        expiry: '12/27',
      }),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si payload invalide', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });

    const response = await POST(
      createPostRequest({ stripePaymentId: 'pm_test' }),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 400 si last4 invalide', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });

    const response = await POST(
      createPostRequest({
        stripePaymentId: 'pm_test',
        cardHolder: 'Jean',
        last4: '42',
        expiry: '12/27',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('crée la méthode et retourne 201', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });

    mockInsertSingle.mockResolvedValue({
      data: {
        id_paiement: 'pm-new',
        nom_carte: 'Jean Dupont',
        derniers_4_chiffres: '4242',
        date_expiration: '12/27',
        est_defaut: false,
      },
      error: null,
    });

    const response = await POST(
      createPostRequest({
        stripePaymentId: 'pm_stripe_123',
        cardHolder: 'Jean Dupont',
        last4: '4242',
        expiry: '12/27',
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.paymentMethod.cardHolder).toBe('Jean Dupont');
    expect(body.paymentMethod.last4).toBe('4242');
  });
});
