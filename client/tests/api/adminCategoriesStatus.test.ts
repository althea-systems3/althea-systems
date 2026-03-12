import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockSelectSingle = vi.fn();
const mockUpdateSingle = vi.fn();

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
      select: () => ({
        eq: () => ({ single: mockSelectSingle }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({ single: mockUpdateSingle }),
        }),
      }),
    }),
  }),
}));

import { PATCH } from '@/app/api/admin/categories/[id]/status/route';

// --- Helpers ---

function createPatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/categories/cat-1/status',
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

const routeParams = { params: Promise.resolve({ id: 'cat-1' }) };

// --- Tests ---

describe('PATCH /api/admin/categories/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  it('retourne 400 si statut invalide', async () => {
    const request = createPatchRequest({ statut: 'brouillon' });
    const response = await PATCH(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('statut');
  });

  it('retourne 404 si catégorie introuvable', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });

    const request = createPatchRequest({ statut: 'active' });
    const response = await PATCH(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('active une catégorie et retourne 200', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1' },
      error: null,
    });
    mockUpdateSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1', statut: 'active' },
      error: null,
    });

    const request = createPatchRequest({ statut: 'active' });
    const response = await PATCH(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.category.statut).toBe('active');
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'categories.status',
      expect.objectContaining({ categoryId: 'cat-1', statut: 'active' }),
    );
  });

  it('désactive une catégorie et retourne 200', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1' },
      error: null,
    });
    mockUpdateSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1', statut: 'inactive' },
      error: null,
    });

    const request = createPatchRequest({ statut: 'inactive' });
    const response = await PATCH(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.category.statut).toBe('inactive');
  });
});
