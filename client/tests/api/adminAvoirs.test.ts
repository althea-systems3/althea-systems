import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();

const mockAvoirsSelectQuery = vi.fn();
const mockFacturesSelectQuery = vi.fn();
const mockCommandesSelectQuery = vi.fn();
const mockUtilisateursSelectQuery = vi.fn();

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
  chain.gte = self;
  chain.lte = self;
  chain.or = self;
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
      if (table === 'avoir') {
        return {
          select: () =>
            createChainableQuery(() => mockAvoirsSelectQuery()),
        };
      }
      if (table === 'facture') {
        return {
          select: () =>
            createChainableQuery(() => mockFacturesSelectQuery()),
        };
      }
      if (table === 'commande') {
        return {
          select: () =>
            createChainableQuery(() => mockCommandesSelectQuery()),
        };
      }
      if (table === 'utilisateur') {
        return {
          select: () =>
            createChainableQuery(() => mockUtilisateursSelectQuery()),
        };
      }
      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
  }),
}));

import { GET } from '@/app/api/admin/avoirs/route';

// --- Helpers ---

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/avoirs');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url.toString(), { method: 'GET' });
}

const fakeAvoir = {
  id_avoir: 'av-1',
  numero_avoir: 'AVO-202604-TESTTEST',
  id_facture: 'inv-1',
  date_emission: '2026-04-01T14:00:00Z',
  montant: 149.99,
  motif: 'annulation',
  pdf_url: '/invoices/av-1.pdf',
};

// --- Tests ---

describe('GET /api/admin/avoirs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockAvoirsSelectQuery.mockReturnValue({
      data: [fakeAvoir],
      error: null,
      count: 1,
    });
    mockFacturesSelectQuery.mockReturnValue({
      data: [
        {
          id_facture: 'inv-1',
          numero_facture: 'FAC-202603-ABCDEFGH',
          id_commande: 'order-1',
        },
      ],
      error: null,
    });
    mockCommandesSelectQuery.mockReturnValue({
      data: [
        {
          id_commande: 'order-1',
          numero_commande: 'CMD-2026-00001',
          id_utilisateur: 'user-1',
        },
      ],
      error: null,
    });
    mockUtilisateursSelectQuery.mockReturnValue({
      data: [
        {
          id_utilisateur: 'user-1',
          nom_complet: 'Alice Dupont',
          email: 'alice@example.com',
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

    const response = await GET(createGetRequest());

    expect(response.status).toBe(401);
  });

  it('retourne la liste paginée avec facture et client', async () => {
    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.creditNotes).toHaveLength(1);
    expect(body.total).toBe(1);

    const avoir = body.creditNotes[0];
    expect(avoir.numero_avoir).toBe('AVO-202604-TESTTEST');
    expect(avoir.facture.numero_facture).toBe('FAC-202603-ABCDEFGH');
    expect(avoir.client.nom_complet).toBe('Alice Dupont');
  });

  it('filtre par motif', async () => {
    const response = await GET(
      createGetRequest({ motif: 'annulation' }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.creditNotes).toHaveLength(1);
  });

  it('retourne 500 si erreur base de données', async () => {
    mockAvoirsSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'connection failed' },
      count: null,
    });

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
  });
});
