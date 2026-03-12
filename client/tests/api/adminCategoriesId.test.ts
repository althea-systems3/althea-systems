import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockSelectSingle = vi.fn();
const mockUpdateSingle = vi.fn();
const mockDeleteEq = vi.fn();
const mockSelectOrder = vi.fn();
const mockSlugNeqLimit = vi.fn();
const mockProductCount = vi.fn();

const mockFirestoreGet = vi.fn();
const mockStorageGetFiles = vi.fn();

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
    from: (table: string) => ({
      select: (...args: unknown[]) => {
        // NOTE: Comptage produits liés (head: true)
        if (table === 'produit_categorie') {
          const hasHeadOption = args.length > 1
            && typeof args[1] === 'object'
            && args[1] !== null
            && 'head' in args[1];

          if (hasHeadOption) {
            return { eq: () => mockProductCount() };
          }
        }

        return {
          eq: (...eqArgs: unknown[]) => {
            // NOTE: Slug lookup avec neq pour exclure self
            if (eqArgs[0] === 'slug') {
              return {
                neq: () => ({ limit: () => mockSlugNeqLimit() }),
              };
            }

            return { single: mockSelectSingle };
          },
          order: () => mockSelectOrder(),
        };
      },
      update: () => ({
        eq: () => ({
          select: () => ({ single: mockUpdateSingle }),
        }),
      }),
      delete: () => ({
        eq: mockDeleteEq,
      }),
    }),
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getFirestoreClient: () => ({
    collection: () => ({
      where: () => ({
        get: mockFirestoreGet,
      }),
    }),
  }),
  getStorageClient: () => ({
    bucket: () => ({
      getFiles: mockStorageGetFiles,
    }),
  }),
}));

import { PUT, DELETE } from '@/app/api/admin/categories/[id]/route';

// --- Helpers ---

function createRequest(
  method: string,
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest('http://localhost/api/admin/categories/cat-1', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

const routeParams = { params: Promise.resolve({ id: 'cat-1' }) };

// --- Tests PUT ---

describe('PUT /api/admin/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  it('retourne 404 si catégorie introuvable', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });

    const request = createRequest('PUT', { nom: 'Nouveau nom' });
    const response = await PUT(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('retourne 400 si slug déjà utilisé par une autre catégorie', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1', nom: 'Bijoux' },
      error: null,
    });
    mockSlugNeqLimit.mockResolvedValue({
      data: [{ id_categorie: 'cat-other' }],
    });

    const request = createRequest('PUT', { slug: 'sacs' });
    const response = await PUT(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('slug');
  });

  it('modifie une catégorie et retourne 200', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1', nom: 'Bijoux' },
      error: null,
    });
    mockSlugNeqLimit.mockResolvedValue({ data: [] });
    mockUpdateSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1', nom: 'Nouveau nom', slug: 'nouveau-nom' },
      error: null,
    });

    const request = createRequest('PUT', {
      nom: 'Nouveau nom',
      slug: 'nouveau-nom',
    });
    const response = await PUT(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.category.nom).toBe('Nouveau nom');
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'categories.update',
      expect.objectContaining({ categoryId: 'cat-1' }),
    );
  });

  it('retourne 400 si nom invalide', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1' },
      error: null,
    });

    const request = createRequest('PUT', { nom: '' });
    const response = await PUT(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('nom');
  });
});

// --- Tests DELETE ---

describe('DELETE /api/admin/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockFirestoreGet.mockResolvedValue({ docs: [] });
    mockStorageGetFiles.mockResolvedValue([[]]);
    mockSelectOrder.mockResolvedValue({ data: [], error: null });
  });

  it('retourne 404 si catégorie introuvable', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });

    const request = createRequest('DELETE');
    const response = await DELETE(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('retourne 400 si des produits sont liés', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1', nom: 'Bijoux' },
      error: null,
    });
    mockProductCount.mockResolvedValue({ count: 3, error: null });

    const request = createRequest('DELETE');
    const response = await DELETE(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('produit');
  });

  it('supprime une catégorie et retourne success', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1', nom: 'Bijoux' },
      error: null,
    });
    mockProductCount.mockResolvedValue({ count: 0, error: null });
    mockDeleteEq.mockResolvedValue({ error: null });

    const request = createRequest('DELETE');
    const response = await DELETE(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'categories.delete',
      expect.objectContaining({ categoryId: 'cat-1' }),
    );
  });

  it('retourne 500 si erreur suppression base', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1', nom: 'Bijoux' },
      error: null,
    });
    mockProductCount.mockResolvedValue({ count: 0, error: null });
    mockDeleteEq.mockResolvedValue({
      error: { message: 'delete failed' },
    });

    const request = createRequest('DELETE');
    const response = await DELETE(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
