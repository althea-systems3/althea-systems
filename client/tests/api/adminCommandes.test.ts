import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();

const mockOrdersSelectQuery = vi.fn();
const mockUsersSelectQuery = vi.fn();
const mockPaymentMethodsSelectQuery = vi.fn();

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
      if (table === 'utilisateur') {
        return {
          select: () => createChainableQuery(() => mockUsersSelectQuery()),
        };
      }
      if (table === 'commande') {
        return {
          select: (
            _cols?: string,
            opts?: Record<string, unknown>,
          ) => {
            if (opts?.count) {
              return createChainableQuery(() => mockOrdersSelectQuery());
            }
            return createChainableQuery(
              () => mockPaymentMethodsSelectQuery(),
            );
          },
        };
      }
      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
  }),
}));

import { GET } from '@/app/api/admin/commandes/route';

// --- Helpers ---

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/commandes');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url.toString(), { method: 'GET' });
}

const fakeOrder = {
  id_commande: 'order-1',
  numero_commande: 'CMD-2026-00001',
  date_commande: '2026-03-01T10:00:00Z',
  montant_ttc: 149.99,
  statut: 'en_cours',
  statut_paiement: 'valide',
  mode_paiement: 'carte',
  paiement_dernier_4: '4242',
  id_utilisateur: 'user-1',
  utilisateur: {
    nom_complet: 'Alice Dupont',
    email: 'alice@example.com',
  },
};

// --- Tests ---

describe('GET /api/admin/commandes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockOrdersSelectQuery.mockReturnValue({
      data: [fakeOrder],
      error: null,
      count: 1,
    });
    mockPaymentMethodsSelectQuery.mockReturnValue({
      data: [{ mode_paiement: 'carte' }],
      error: null,
    });
    mockUsersSelectQuery.mockReturnValue({
      data: [],
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

  it('retourne la liste paginée avec client et paiement masqué', async () => {
    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(1);

    const order = body.orders[0];
    expect(order.numero_commande).toBe('CMD-2026-00001');
    expect(order.client.nom_complet).toBe('Alice Dupont');
    expect(order.paiement_dernier_4_masque).toBe('**** **** **** 4242');
    expect(order.mode_paiement).toBe('carte');
    expect(body.paymentMethods).toContain('carte');
  });

  it('filtre par statut', async () => {
    const response = await GET(createGetRequest({ status: 'en_cours' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toHaveLength(1);
  });

  it('filtre par statut paiement', async () => {
    const response = await GET(
      createGetRequest({ paymentStatus: 'valide' }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toHaveLength(1);
  });

  it('retourne 500 si erreur base de données', async () => {
    mockOrdersSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'connection failed' },
      count: null,
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
  });
});
