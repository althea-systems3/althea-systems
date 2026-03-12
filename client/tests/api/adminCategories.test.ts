import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockSupabaseOrder = vi.fn();
const mockSupabaseCount = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseInsertSingle = vi.fn();
const mockSupabaseSlugData = vi.fn();

const mockFirestoreAdd = vi.fn();

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
          eq: (...eqArgs: unknown[]) => {
            // NOTE: slug lookup retourne directement les données
            if (eqArgs[0] === 'slug') {
              return { limit: () => mockSupabaseSlugData() };
            }

            return { order: mockSupabaseOrder };
          },
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
        };
      },
      insert: () => ({
        select: () => ({ single: mockSupabaseInsertSingle }),
      }),
    }),
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getFirestoreClient: () => ({
    collection: () => ({ add: mockFirestoreAdd }),
  }),
}));

import { GET, POST } from '@/app/api/admin/categories/route';

// --- Helpers ---

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Tests GET ---

describe('GET /api/admin/categories', () => {
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

  it('retourne la liste des catégories avec comptage produits', async () => {
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockSupabaseOrder.mockResolvedValue({
      data: [
        { id_categorie: 'c1', nom: 'Bijoux', ordre_affiche: 1 },
        { id_categorie: 'c2', nom: 'Sacs', ordre_affiche: 2 },
      ],
      error: null,
    });
    mockSupabaseCount.mockResolvedValue({ count: 5, error: null });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.categories).toHaveLength(2);
    expect(body.categories[0].nombre_produits).toBe(5);
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

describe('POST /api/admin/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockFirestoreAdd.mockResolvedValue({ id: 'doc-1' });
  });

  it('retourne 400 si nom manquant', async () => {
    const request = createPostRequest({ slug: 'bijoux' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('nom');
  });

  it('retourne 400 si slug manquant', async () => {
    const request = createPostRequest({ nom: 'Bijoux' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('slug');
  });

  it('retourne 400 si slug déjà utilisé', async () => {
    mockSupabaseSlugData.mockResolvedValue({
      data: [{ id_categorie: 'c-existing' }],
    });

    const request = createPostRequest({
      nom: 'Bijoux',
      slug: 'bijoux',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('slug');
  });

  it('crée une catégorie et retourne 201', async () => {
    mockSupabaseSlugData.mockResolvedValue({ data: [] });
    mockSupabaseSingle.mockResolvedValue({
      data: { ordre_affiche: 2 },
    });
    mockSupabaseInsertSingle.mockResolvedValue({
      data: {
        id_categorie: 'new-1',
        nom: 'Bijoux',
        slug: 'bijoux',
        description: null,
        ordre_affiche: 3,
        statut: 'active',
        image_url: null,
      },
      error: null,
    });

    const request = createPostRequest({
      nom: 'Bijoux',
      slug: 'bijoux',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.category.id_categorie).toBe('new-1');
    expect(body.category.nom).toBe('Bijoux');
    expect(mockFirestoreAdd).toHaveBeenCalled();
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'categories.create',
      expect.objectContaining({ categoryId: 'new-1' }),
    );
  });

  it('retourne 500 si erreur insertion base', async () => {
    mockSupabaseSlugData.mockResolvedValue({ data: [] });
    mockSupabaseSingle.mockResolvedValue({ data: null });
    mockSupabaseInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    });

    const request = createPostRequest({
      nom: 'Bijoux',
      slug: 'bijoux',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
