import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockCountResult = vi.fn();
const mockUpdateResult = vi.fn();

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
        in: mockCountResult,
      }),
      update: () => ({
        eq: mockUpdateResult,
      }),
    }),
  }),
}));

import { PATCH } from '@/app/api/admin/carousel/reorder/route';

// --- Helpers ---

function createPatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/carousel/reorder', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Tests ---

describe('PATCH /api/admin/carousel/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  it('retourne 400 si slides est vide', async () => {
    const request = createPatchRequest({ slides: [] });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('requise');
  });

  it('retourne 400 si ordre en doublon', async () => {
    const request = createPatchRequest({
      slides: [
        { id: 's1', ordre: 1 },
        { id: 's2', ordre: 1 },
      ],
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('doublons');
  });

  it('retourne 400 si ordre négatif ou zéro', async () => {
    const request = createPatchRequest({
      slides: [{ id: 's1', ordre: 0 }],
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('positif');
  });

  it('retourne 404 si un slide n existe pas', async () => {
    mockCountResult.mockResolvedValue({ count: 1, error: null });

    const request = createPatchRequest({
      slides: [
        { id: 's1', ordre: 1 },
        { id: 's2', ordre: 2 },
      ],
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvables');
  });

  it('réordonne les slides et retourne success', async () => {
    mockCountResult.mockResolvedValue({ count: 2, error: null });
    mockUpdateResult.mockResolvedValue({ error: null });

    const request = createPatchRequest({
      slides: [
        { id: 's1', ordre: 2 },
        { id: 's2', ordre: 1 },
      ],
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'carousel.reorder',
      expect.objectContaining({ slideIds: ['s1', 's2'] }),
    );
  });
});
