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

import { PATCH } from '@/app/api/admin/carousel/[id]/status/route';

// --- Helpers ---

function createPatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/carousel/slide-1/status',
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

const routeParams = { params: Promise.resolve({ id: 'slide-1' }) };

// --- Tests ---

describe('PATCH /api/admin/carousel/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  it('retourne 400 si actif n est pas un booléen', async () => {
    const request = createPatchRequest({ actif: 'oui' });
    const response = await PATCH(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('booléen');
  });

  it('retourne 404 si slide introuvable', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });

    const request = createPatchRequest({ actif: true });
    const response = await PATCH(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('active un slide et retourne 200', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_slide: 'slide-1' },
      error: null,
    });
    mockUpdateSingle.mockResolvedValue({
      data: { id_slide: 'slide-1', actif: true },
      error: null,
    });

    const request = createPatchRequest({ actif: true });
    const response = await PATCH(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slide.actif).toBe(true);
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'carousel.status',
      expect.objectContaining({ slideId: 'slide-1', actif: true }),
    );
  });

  it('désactive un slide et retourne 200', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_slide: 'slide-1' },
      error: null,
    });
    mockUpdateSingle.mockResolvedValue({
      data: { id_slide: 'slide-1', actif: false },
      error: null,
    });

    const request = createPatchRequest({ actif: false });
    const response = await PATCH(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slide.actif).toBe(false);
  });
});
