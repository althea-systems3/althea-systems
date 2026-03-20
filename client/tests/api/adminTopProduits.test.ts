import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockSupabaseOrder = vi.fn();
const mockSupabaseCount = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseUpdateSingle = vi.fn();

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
    from: () => ({
      select: (...args: unknown[]) => {
        const hasHeadOption = args.length > 1
          && typeof args[1] === 'object'
          && args[1] !== null
          && 'head' in args[1];

        if (hasHeadOption) {
          return { eq: () => mockSupabaseCount() };
        }

        return {
          eq: () => ({
            order: (...orderArgs: unknown[]) => {
              const isDescending = orderArgs.length > 1
                && typeof orderArgs[1] === 'object'
                && orderArgs[1] !== null
                && 'ascending' in orderArgs[1]
                && (orderArgs[1] as { ascending: boolean }).ascending === false;

              if (isDescending) {
                return { limit: () => ({ single: mockSupabaseSingle }) };
              }

              return mockSupabaseOrder();
            },
            single: mockSupabaseSingle,
          }),
        };
      },
      update: () => ({
        eq: () => ({
          select: () => ({ single: mockSupabaseUpdateSingle }),
        }),
      }),
    }),
  }),
}));

import { GET, POST } from '@/app/api/admin/top-produits/route';

// --- Helpers ---

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/top-produits', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Tests GET ---

describe('GET /api/admin/top-produits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 401 si utilisateur non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentification requise.');
  });

  it('retourne la liste des top produits', async () => {
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockSupabaseOrder.mockResolvedValue({
      data: [
        { id_produit: 'p1', nom: 'Produit A', priorite: 1 },
        { id_produit: 'p2', nom: 'Produit B', priorite: 2 },
      ],
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.produits).toHaveLength(2);
    expect(body.produits[0].nom).toBe('Produit A');
  });

  it('retourne 500 si erreur base de données', async () => {
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockSupabaseOrder.mockResolvedValue({
      data: null,
      error: { message: 'connection failed' },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});

// --- Tests POST ---

describe('POST /api/admin/top-produits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  it('retourne 400 si id_produit manquant', async () => {
    const request = createPostRequest({});

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('obligatoire');
  });

  it('retourne 404 si produit introuvable', async () => {
    mockSupabaseSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const request = createPostRequest({ id_produit: 'inexistant' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('retourne 400 si produit non publié', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: { id_produit: 'p1', statut: 'brouillon', est_top_produit: false },
      error: null,
    });

    const request = createPostRequest({ id_produit: 'p1' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('publiés');
  });

  it('retourne 400 si produit déjà top', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: { id_produit: 'p1', statut: 'publie', est_top_produit: true },
      error: null,
    });

    const request = createPostRequest({ id_produit: 'p1' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('déjà');
  });

  it('retourne 400 si limite top produits atteinte', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: { id_produit: 'p1', statut: 'publie', est_top_produit: false },
      error: null,
    });
    mockSupabaseCount.mockResolvedValue({ count: 8, error: null });

    const request = createPostRequest({ id_produit: 'p1' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Limite');
  });

  it('ajoute un produit aux top et retourne 201', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: { id_produit: 'p1', statut: 'publie', est_top_produit: false },
      error: null,
    });
    mockSupabaseCount.mockResolvedValue({ count: 2, error: null });
    mockSupabaseUpdateSingle.mockResolvedValue({
      data: {
        id_produit: 'p1',
        nom: 'Produit A',
        est_top_produit: true,
        priorite: 3,
      },
      error: null,
    });

    const request = createPostRequest({ id_produit: 'p1' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.produit.id_produit).toBe('p1');
    expect(body.produit.est_top_produit).toBe(true);
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'top-produits.add',
      expect.objectContaining({ productId: 'p1' }),
    );
  });

  it('retourne 500 si erreur mise à jour base', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: { id_produit: 'p1', statut: 'publie', est_top_produit: false },
      error: null,
    });
    mockSupabaseCount.mockResolvedValue({ count: 0, error: null });
    mockSupabaseUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    });

    const request = createPostRequest({ id_produit: 'p1' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
