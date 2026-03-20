import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockSupabaseCount = vi.fn();
const mockSupabaseUpdate = vi.fn();

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
          in: () => mockSupabaseCount(),
        }),
      }),
      update: () => ({
        eq: () => mockSupabaseUpdate(),
      }),
    }),
  }),
}));

import { PATCH } from '@/app/api/admin/top-produits/reorder/route';

// --- Helpers ---

function createPatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/top-produits/reorder', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Tests PATCH ---

describe('PATCH /api/admin/top-produits/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  it('retourne 400 si liste vide', async () => {
    const request = createPatchRequest({ produits: [] });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('requise');
  });

  it('retourne 400 si priorité en doublon', async () => {
    const request = createPatchRequest({
      produits: [
        { id: 'p1', priorite: 1 },
        { id: 'p2', priorite: 1 },
      ],
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('doublons');
  });

  it('retourne 400 si priorité invalide', async () => {
    const request = createPatchRequest({
      produits: [{ id: 'p1', priorite: 0 }],
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('entier positif');
  });

  it('retourne 404 si produit introuvable dans les top', async () => {
    mockSupabaseCount.mockResolvedValue({ count: 1, error: null });

    const request = createPatchRequest({
      produits: [
        { id: 'p1', priorite: 1 },
        { id: 'p2', priorite: 2 },
      ],
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvables');
  });

  it('réordonne les produits et retourne 200', async () => {
    mockSupabaseCount.mockResolvedValue({ count: 2, error: null });
    mockSupabaseUpdate.mockResolvedValue({ error: null });

    const request = createPatchRequest({
      produits: [
        { id: 'p1', priorite: 2 },
        { id: 'p2', priorite: 1 },
      ],
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'top-produits.reorder',
      expect.objectContaining({
        productIds: ['p1', 'p2'],
        newOrder: [2, 1],
      }),
    );
  });
});
