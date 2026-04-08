import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockGetCartSessionId = vi.fn();
const mockCartSingle = vi.fn();
const mockCartLinesEq = vi.fn();
const mockStripeCreate = vi.fn();

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
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
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

      // ligne_panier
      return {
        select: () => ({
          eq: () => mockCartLinesEq(),
        }),
      };
    },
  }),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: () => ({
    paymentIntents: {
      create: (params: unknown) => mockStripeCreate(params),
    },
  }),
}));

vi.mock('@/lib/checkout/constants', () => ({
  CURRENCY_CODE: 'eur',
}));

// --- Import après mocks ---

import { POST } from '@/app/api/checkout/payment-intent/route';

// --- Tests ---

describe('POST /api/checkout/payment-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 400 si panier introuvable', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockGetCartSessionId.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Panier introuvable');
  });

  it('retourne 400 si panier vide', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });
    mockCartSingle.mockResolvedValue({
      data: { id_panier: 'cart-001' },
    });
    mockCartLinesEq.mockResolvedValue({ data: [], error: null });

    const response = await POST();

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Panier vide');
  });

  it('retourne 409 si stock insuffisant', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });
    mockCartSingle.mockResolvedValue({
      data: { id_panier: 'cart-001' },
    });
    mockCartLinesEq.mockResolvedValue({
      data: [
        {
          id_produit: 'prod-001',
          quantite: 10,
          produit: {
            prix_ttc: 100,
            quantite_stock: 3,
            statut: 'publie',
          },
        },
      ],
      error: null,
    });

    const response = await POST();

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.issues).toHaveLength(1);
  });

  it('retourne le clientSecret Stripe en cas de succès', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });
    mockCartSingle.mockResolvedValue({
      data: { id_panier: 'cart-001' },
    });
    mockCartLinesEq.mockResolvedValue({
      data: [
        {
          id_produit: 'prod-001',
          quantite: 2,
          produit: {
            prix_ttc: 49.99,
            quantite_stock: 10,
            statut: 'publie',
          },
        },
      ],
      error: null,
    });

    mockStripeCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret',
    });

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.clientSecret).toBe('pi_test_123_secret');
    expect(body.paymentIntentId).toBe('pi_test_123');
    expect(body.amount).toBe(9998);
  });

  it('calcule le montant en centimes correctement', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });
    mockCartSingle.mockResolvedValue({
      data: { id_panier: 'cart-001' },
    });
    mockCartLinesEq.mockResolvedValue({
      data: [
        {
          id_produit: 'prod-001',
          quantite: 1,
          produit: {
            prix_ttc: 29.99,
            quantite_stock: 5,
            statut: 'publie',
          },
        },
        {
          id_produit: 'prod-002',
          quantite: 3,
          produit: {
            prix_ttc: 10.00,
            quantite_stock: 20,
            statut: 'publie',
          },
        },
      ],
      error: null,
    });

    mockStripeCreate.mockResolvedValue({
      id: 'pi_test_456',
      client_secret: 'pi_test_456_secret',
    });

    const response = await POST();
    const body = await response.json();

    // 29.99 + 30.00 = 59.99 → 5999 centimes
    expect(body.amount).toBe(5999);
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5999,
        currency: 'eur',
      }),
    );
  });
});
