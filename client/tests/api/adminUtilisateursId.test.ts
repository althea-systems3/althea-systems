import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockUserSelectQuery = vi.fn();
const mockUserUpdateQuery = vi.fn();
const mockAddressSelectQuery = vi.fn();
const mockPaymentSelectQuery = vi.fn();
const mockOrderSelectQuery = vi.fn();
const mockAddressUpdateQuery = vi.fn();
const mockPaymentDeleteQuery = vi.fn();
const mockGetUserById = vi.fn();
const mockUpdateUserById = vi.fn();

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
  chain.single = () =>
    Promise.resolve(resolveFn()).then((v) => v);
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
          select: () => createChainableQuery(() => mockUserSelectQuery()),
          update: () => createChainableQuery(() => mockUserUpdateQuery()),
        };
      }
      if (table === 'adresse') {
        return {
          select: () => createChainableQuery(() => mockAddressSelectQuery()),
          update: () => createChainableQuery(() => mockAddressUpdateQuery()),
        };
      }
      if (table === 'methode_paiement') {
        return {
          select: () =>
            createChainableQuery(() => ({ data: [], error: null })),
          delete: () => createChainableQuery(() => mockPaymentDeleteQuery()),
        };
      }
      if (table === 'commande') {
        return {
          select: () => createChainableQuery(() => mockOrderSelectQuery()),
        };
      }
      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
    auth: {
      admin: {
        getUserById: (id: string) => mockGetUserById(id),
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
  }),
}));

import { GET, PATCH, DELETE } from '@/app/api/admin/utilisateurs/[id]/route';

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
  return new Request('http://localhost/api/admin/utilisateurs/user-1', init);
}

const fakeUser = {
  id_utilisateur: 'user-1',
  email: 'alice@example.com',
  nom_complet: 'Alice Dupont',
  est_admin: false,
  statut: 'actif',
  email_verifie: true,
  date_inscription: '2025-01-15T10:00:00Z',
  cgu_acceptee_le: '2025-01-15T10:00:00Z',
  date_validation_email: '2025-01-15T10:05:00Z',
};

// --- Tests ---

describe('GET /api/admin/utilisateurs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);

    mockUserSelectQuery.mockReturnValue({
      data: fakeUser,
      error: null,
    });
    mockAddressSelectQuery.mockReturnValue({
      data: [],
      error: null,
    });
    mockPaymentSelectQuery.mockReturnValue({
      data: [],
      error: null,
    });
    mockOrderSelectQuery.mockReturnValue({
      data: [],
      error: null,
    });
    mockGetUserById.mockResolvedValue({
      data: {
        user: { id: 'user-1', last_sign_in_at: '2025-06-01T08:00:00Z' },
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

    const response = await GET(
      createRequest('GET'),
      createRouteContext('user-1'),
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

  it('retourne 404 si utilisateur introuvable', async () => {
    mockUserSelectQuery.mockReturnValue({
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
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id_utilisateur).toBe('user-1');
    expect(body.user.derniere_connexion).toBe('2025-06-01T08:00:00Z');
    expect(body.summary).toBeDefined();
    expect(body.addresses).toBeDefined();
    expect(body.paymentMethods).toBeDefined();
    expect(body.orders).toBeDefined();
  });
});

describe('PATCH /api/admin/utilisateurs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);

    mockUserSelectQuery.mockReturnValue({
      data: fakeUser,
      error: null,
    });
    mockUserUpdateQuery.mockReturnValue({
      data: { ...fakeUser, statut: 'inactif' },
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

    const response = await PATCH(
      createRequest('PATCH', { statut: 'inactif' }),
      createRouteContext('user-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si statut invalide', async () => {
    const response = await PATCH(
      createRequest('PATCH', { statut: 'invalid' }),
      createRouteContext('user-1'),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 404 si utilisateur introuvable', async () => {
    mockUserSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await PATCH(
      createRequest('PATCH', { statut: 'inactif' }),
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('change le statut avec succès', async () => {
    const response = await PATCH(
      createRequest('PATCH', { statut: 'inactif' }),
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.statut).toBe('inactif');
  });

  it('log le changement de statut', async () => {
    await PATCH(
      createRequest('PATCH', { statut: 'inactif' }),
      createRouteContext('user-1'),
    );

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'users.status_update',
      expect.objectContaining({
        userId: 'user-1',
        previousStatus: 'actif',
        nextStatus: 'inactif',
      }),
    );
  });
});

describe('DELETE /api/admin/utilisateurs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);

    mockUserSelectQuery.mockReturnValue({
      data: fakeUser,
      error: null,
    });
    mockUserUpdateQuery.mockReturnValue({ error: null });
    mockAddressUpdateQuery.mockReturnValue({ error: null });
    mockPaymentDeleteQuery.mockReturnValue({ error: null });
    mockUpdateUserById.mockResolvedValue({ error: null });
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await DELETE(
      createRequest('DELETE', {
        acknowledgeRgpd: true,
        confirmationText: 'SUPPRIMER',
      }),
      createRouteContext('user-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 sans confirmation RGPD', async () => {
    const response = await DELETE(
      createRequest('DELETE', { acknowledgeRgpd: false }),
      createRouteContext('user-1'),
    );

    expect(response.status).toBe(400);
  });

  it('retourne 400 si compte admin', async () => {
    mockUserSelectQuery.mockReturnValue({
      data: { ...fakeUser, est_admin: true },
      error: null,
    });

    const response = await DELETE(
      createRequest('DELETE', {
        acknowledgeRgpd: true,
        confirmationText: 'SUPPRIMER',
      }),
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('admin_delete_forbidden');
  });

  it('supprime avec anonymisation RGPD', async () => {
    const response = await DELETE(
      createRequest('DELETE', {
        acknowledgeRgpd: true,
        confirmationText: 'SUPPRIMER',
      }),
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('log la suppression RGPD', async () => {
    await DELETE(
      createRequest('DELETE', {
        acknowledgeRgpd: true,
        confirmationText: 'SUPPRIMER',
      }),
      createRouteContext('user-1'),
    );

    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'users.rgpd_delete',
      expect.objectContaining({ userId: 'user-1' }),
    );
  });
});
