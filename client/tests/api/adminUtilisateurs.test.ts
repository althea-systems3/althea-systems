import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();

const mockUsersSelectQuery = vi.fn();
const mockOrdersSelectQuery = vi.fn();
const mockAddressesSelectQuery = vi.fn();
const mockGetUserById = vi.fn();

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
  chain.order = self;
  chain.range = self;
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
          select: () => createChainableQuery(() => mockOrdersSelectQuery()),
        };
      }
      if (table === 'adresse') {
        return {
          select: () =>
            createChainableQuery(() => mockAddressesSelectQuery()),
        };
      }
      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
    auth: {
      admin: {
        getUserById: (id: string) => mockGetUserById(id),
      },
    },
  }),
}));

import { GET } from '@/app/api/admin/utilisateurs/route';

// --- Helpers ---

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/utilisateurs');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url.toString(), { method: 'GET' });
}

const fakeUser = {
  id_utilisateur: 'user-1',
  email: 'alice@example.com',
  nom_complet: 'Alice Dupont',
  est_admin: false,
  statut: 'actif',
  email_verifie: true,
  date_inscription: '2025-01-15T10:00:00Z',
};

// --- Tests ---

describe('GET /api/admin/utilisateurs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockUsersSelectQuery.mockReturnValue({
      data: [fakeUser],
      error: null,
      count: 1,
    });
    mockOrdersSelectQuery.mockReturnValue({
      data: [
        { id_utilisateur: 'user-1', montant_ttc: 50 },
        { id_utilisateur: 'user-1', montant_ttc: 30 },
      ],
      error: null,
    });
    mockAddressesSelectQuery.mockReturnValue({
      data: [
        {
          id_utilisateur: 'user-1',
          id_adresse: 'adr-1',
          adresse_1: '10 rue de Paris',
          code_postal: '75001',
          ville: 'Paris',
          pays: 'France',
        },
      ],
      error: null,
    });
    mockGetUserById.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          last_sign_in_at: '2025-06-01T08:00:00Z',
        },
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

    const response = await GET(createGetRequest());

    expect(response.status).toBe(401);
  });

  it('retourne la liste paginée avec données enrichies', async () => {
    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(1);

    const user = body.users[0];
    expect(user.id_utilisateur).toBe('user-1');
    expect(user.nombre_commandes).toBe(2);
    expect(user.chiffre_affaires_total).toBe(80);
    expect(user.derniere_connexion).toBe('2025-06-01T08:00:00Z');
    expect(user.adresses_facturation).toContain(
      '10 rue de Paris 75001 Paris France',
    );
    expect(user.adresses_facturation_count).toBe(1);
  });

  it('filtre par statut', async () => {
    const response = await GET(createGetRequest({ status: 'actif' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
  });

  it('retourne 500 si erreur base de données', async () => {
    mockUsersSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'connection failed' },
      count: null,
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
  });
});
