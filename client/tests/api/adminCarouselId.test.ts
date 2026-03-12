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
const mockUpdateEq = vi.fn();

const mockFirestoreGet = vi.fn();
const mockFirestoreDelete = vi.fn();
const mockStorageGetFiles = vi.fn();
const mockFileDelete = vi.fn();

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
        const firstArg = typeof args[0] === 'string' ? args[0] : '';

        // select('id_slide') pour vérifier existence
        if (firstArg === 'id_slide') {
          return { eq: () => ({ single: mockSelectSingle }) };
        }

        // select('*') avec order → reindex
        return {
          eq: () => ({ single: mockSelectSingle }),
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

import { PUT, DELETE } from '@/app/api/admin/carousel/[id]/route';

// --- Helpers ---

function createRequest(
  method: string,
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest('http://localhost/api/admin/carousel/slide-1', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

const routeParams = { params: Promise.resolve({ id: 'slide-1' }) };

// --- Tests PUT ---

describe('PUT /api/admin/carousel/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  it('retourne 404 si slide introuvable', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });

    const request = createRequest('PUT', { titre: 'Nouveau titre' });
    const response = await PUT(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('retourne 400 si titre invalide', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_slide: 'slide-1', titre: 'Ancien' },
      error: null,
    });

    const request = createRequest('PUT', { titre: '' });
    const response = await PUT(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('titre');
  });

  it('modifie un slide et retourne 200', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_slide: 'slide-1', titre: 'Ancien titre' },
      error: null,
    });
    mockUpdateSingle.mockResolvedValue({
      data: { id_slide: 'slide-1', titre: 'Nouveau titre' },
      error: null,
    });

    const request = createRequest('PUT', { titre: 'Nouveau titre' });
    const response = await PUT(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slide.titre).toBe('Nouveau titre');
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'carousel.update',
      expect.objectContaining({ slideId: 'slide-1' }),
    );
  });

  it('retourne 400 si lien de redirection invalide', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_slide: 'slide-1' },
      error: null,
    });

    const request = createRequest('PUT', {
      lien_redirection: 'javascript:alert(1)',
    });
    const response = await PUT(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('lien');
  });
});

// --- Tests DELETE ---

describe('DELETE /api/admin/carousel/[id]', () => {
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

  it('retourne 404 si slide introuvable', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });

    const request = createRequest('DELETE');
    const response = await DELETE(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('supprime un slide et retourne success', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_slide: 'slide-1', titre: 'Mon slide' },
      error: null,
    });
    mockDeleteEq.mockResolvedValue({ error: null });

    const request = createRequest('DELETE');
    const response = await DELETE(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'carousel.delete',
      expect.objectContaining({ slideId: 'slide-1' }),
    );
  });

  it('retourne 500 si erreur suppression base', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_slide: 'slide-1', titre: 'Mon slide' },
      error: null,
    });
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
