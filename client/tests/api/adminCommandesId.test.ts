import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockOrderSelectQuery = vi.fn();
const mockOrderUpdateQuery = vi.fn();
const mockLinesSelectQuery = vi.fn();
const mockAddressSelectQuery = vi.fn();
const mockInvoiceSelectQuery = vi.fn();
const mockHistorySelectQuery = vi.fn();
const mockHistoryInsertQuery = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/firebase/logActivity', () => ({
  logAdminActivity: (...args: unknown[]) => mockLogAdminActivity(...args),
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
      if (table === 'commande') {
        return {
          select: () => createChainableQuery(() => mockOrderSelectQuery()),
          update: () => createChainableQuery(() => mockOrderUpdateQuery()),
        };
      }
      if (table === 'ligne_commande') {
        return {
          select: () => createChainableQuery(() => mockLinesSelectQuery()),
        };
      }
      if (table === 'adresse') {
        return {
          select: () =>
            createChainableQuery(() => mockAddressSelectQuery()),
        };
      }
      if (table === 'facture') {
        return {
          select: () =>
            createChainableQuery(() => mockInvoiceSelectQuery()),
        };
      }
      if (table === 'historique_statut') {
        return {
          select: () =>
            createChainableQuery(() => mockHistorySelectQuery()),
          insert: () =>
            Promise.resolve(mockHistoryInsertQuery()).then((v) => v),
        };
      }
      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
  }),
}));

import { GET, PATCH } from '@/app/api/admin/commandes/[id]/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(
  method: string,
  body?: Record<string, unknown>,
): Request {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new Request('http://localhost/api/admin/commandes/order-1', init);
}

const fakeOrder = {
  id_commande: 'order-1',
  numero_commande: 'CMD-2026-00001',
  date_commande: '2026-03-01T10:00:00Z',
  montant_ht: 124.99,
  montant_tva: 25.0,
  montant_ttc: 149.99,
  statut: 'en_attente',
  statut_paiement: 'valide',
  mode_paiement: 'carte',
  paiement_dernier_4: '4242',
  id_utilisateur: 'user-1',
  id_adresse: 'adr-1',
  utilisateur: {
    nom_complet: 'Alice Dupont',
    email: 'alice@example.com',
  },
};

// --- Tests ---

describe('GET /api/admin/commandes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);

    mockOrderSelectQuery.mockReturnValue({
      data: fakeOrder,
      error: null,
    });
    mockLinesSelectQuery.mockReturnValue({
      data: [
        {
          id_ligne: 'line-1',
          id_produit: 'prod-1',
          quantite: 2,
          prix_unitaire_ht: 62.5,
          prix_total_ttc: 149.99,
          produit: { nom: 'Produit A', slug: 'produit-a' },
        },
      ],
      error: null,
    });
    mockAddressSelectQuery.mockReturnValue({
      data: {
        id_adresse: 'adr-1',
        prenom: 'Alice',
        nom: 'Dupont',
        adresse_1: '10 rue de Paris',
        adresse_2: null,
        ville: 'Paris',
        region: null,
        code_postal: '75001',
        pays: 'France',
        telephone: null,
      },
      error: null,
    });
    mockInvoiceSelectQuery.mockReturnValue({
      data: {
        id_facture: 'inv-1',
        numero_facture: 'FAC-2026-00001',
        date_emission: '2026-03-01T12:00:00Z',
        montant_ttc: 149.99,
        statut: 'payee',
        pdf_url: '/invoices/inv-1.pdf',
      },
      error: null,
    });
    mockHistorySelectQuery.mockReturnValue({
      data: [
        {
          id_historique: 'hist-1',
          id_commande: 'order-1',
          statut_precedent: 'en_attente',
          nouveau_statut: 'en_cours',
          date_changement: '2026-03-02T08:00:00Z',
          id_admin_modification: 'admin-1',
          admin: { nom_complet: 'Admin Test', email: 'admin@test.com' },
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

    const response = await GET(
      createRequest('GET'),
      createRouteContext('order-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si id vide', async () => {
    const response = await GET(
      createRequest('GET'),
      createRouteContext(''),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 404 si commande introuvable', async () => {
    mockOrderSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await GET(
      createRequest('GET'),
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne le détail complet', async () => {
    const response = await GET(
      createRequest('GET'),
      createRouteContext('order-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.numero_commande).toBe('CMD-2026-00001');
    expect(body.order.paiement_dernier_4_masque).toBe(
      '**** **** **** 4242',
    );
    expect(body.order.date_paiement).toBe('2026-03-01T12:00:00Z');
    expect(body.order.client.nom_complet).toBe('Alice Dupont');
    expect(body.lines).toHaveLength(1);
    expect(body.lines[0].produit.nom).toBe('Produit A');
    expect(body.address.ville).toBe('Paris');
    expect(body.invoice.numero_facture).toBe('FAC-2026-00001');
    expect(body.statusHistory).toHaveLength(1);
    expect(body.statusHistory[0].admin.nom_complet).toBe('Admin Test');
  });
});

describe('PATCH /api/admin/commandes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);

    mockOrderSelectQuery.mockReturnValue({
      data: fakeOrder,
      error: null,
    });
    mockOrderUpdateQuery.mockReturnValue({
      data: { ...fakeOrder, statut: 'en_cours' },
      error: null,
    });
    mockHistoryInsertQuery.mockReturnValue({ error: null });
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await PATCH(
      createRequest('PATCH', { statut: 'en_cours' }),
      createRouteContext('order-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si statut invalide', async () => {
    const response = await PATCH(
      createRequest('PATCH', { statut: 'invalid' }),
      createRouteContext('order-1'),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 404 si commande introuvable', async () => {
    mockOrderSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await PATCH(
      createRequest('PATCH', { statut: 'en_cours' }),
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne 200 sans changement si même statut', async () => {
    const response = await PATCH(
      createRequest('PATCH', { statut: 'en_attente' }),
      createRouteContext('order-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.statut).toBe('en_attente');
    expect(mockLogAdminActivity).not.toHaveBeenCalled();
  });

  it('change le statut avec succès', async () => {
    const response = await PATCH(
      createRequest('PATCH', { statut: 'en_cours' }),
      createRouteContext('order-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.statut).toBe('en_cours');
  });

  it('log le changement de statut', async () => {
    await PATCH(
      createRequest('PATCH', { statut: 'en_cours' }),
      createRouteContext('order-1'),
    );

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'orders.status_update',
      expect.objectContaining({
        orderId: 'order-1',
        previousStatus: 'en_attente',
        nextStatus: 'en_cours',
      }),
    );
  });
});
