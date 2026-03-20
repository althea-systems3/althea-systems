import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockSupabaseSingle = vi.fn();
const mockSupabaseUpdateResult = vi.fn();
const mockSupabaseReindexOrder = vi.fn();

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
        eq: () => ({
          order: () => mockSupabaseReindexOrder(),
          single: mockSupabaseSingle,
        }),
      }),
      update: () => ({
        eq: () => mockSupabaseUpdateResult(),
      }),
    }),
  }),
}));

import { DELETE } from '@/app/api/admin/top-produits/[id]/route';

// --- Helpers ---

function createDeleteRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/top-produits/p1', {
    method: 'DELETE',
  });
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// --- Tests DELETE ---

describe('DELETE /api/admin/top-produits/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  it('retourne 401 si utilisateur non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await DELETE(createDeleteRequest(), createParams('p1'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentification requise.');
  });

  it('retourne 404 si produit introuvable', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await DELETE(createDeleteRequest(), createParams('inexistant'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('retourne 400 si produit pas dans les top', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: { id_produit: 'p1', nom: 'Produit A', est_top_produit: false },
      error: null,
    });

    const response = await DELETE(createDeleteRequest(), createParams('p1'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('pas dans les top');
  });

  it('retire le produit des top et retourne 200', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: { id_produit: 'p1', nom: 'Produit A', est_top_produit: true },
      error: null,
    });
    mockSupabaseUpdateResult.mockResolvedValue({ error: null });
    mockSupabaseReindexOrder.mockResolvedValue({
      data: [{ id_produit: 'p2' }, { id_produit: 'p3' }],
    });

    const response = await DELETE(createDeleteRequest(), createParams('p1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'top-produits.remove',
      expect.objectContaining({ productId: 'p1', nom: 'Produit A' }),
    );
  });

  it('retourne 500 si erreur mise à jour base', async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: { id_produit: 'p1', nom: 'Produit A', est_top_produit: true },
      error: null,
    });
    mockSupabaseUpdateResult.mockResolvedValue({
      error: { message: 'update failed' },
    });

    const response = await DELETE(createDeleteRequest(), createParams('p1'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
