import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockSelectSingle = vi.fn();
const mockUpdateEq = vi.fn();

const mockFileSave = vi.fn();
const mockFileMakePublic = vi.fn();
const mockFirestoreGet = vi.fn();
const mockFirestoreAdd = vi.fn();
const mockFirestoreUpdate = vi.fn();

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
        eq: mockUpdateEq,
      }),
    }),
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getFirestoreClient: () => ({
    collection: () => ({
      where: () => ({ get: mockFirestoreGet }),
      add: mockFirestoreAdd,
    }),
  }),
  getStorageClient: () => ({
    bucket: () => ({
      name: 'test-bucket',
      file: () => ({
        save: mockFileSave,
        makePublic: mockFileMakePublic,
      }),
    }),
  }),
}));

import { POST } from '@/app/api/admin/categories/[id]/upload/route';

// --- Helpers ---

function createUploadRequest(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
): NextRequest {
  const fileContent = new Uint8Array(sizeBytes);
  const file = new File([fileContent], fileName, { type: mimeType });

  const formData = new FormData();
  formData.append('file', file);

  return new NextRequest(
    'http://localhost/api/admin/categories/cat-1/upload',
    { method: 'POST', body: formData },
  );
}

const routeParams = { params: Promise.resolve({ id: 'cat-1' }) };

// --- Tests ---

describe('POST /api/admin/categories/[id]/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockFileSave.mockResolvedValue(undefined);
    mockFileMakePublic.mockResolvedValue(undefined);
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('retourne 404 si catégorie introuvable', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });

    const request = createUploadRequest('image.jpg', 'image/jpeg', 1024);
    const response = await POST(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('introuvable');
  });

  it('retourne 400 si type MIME non autorisé', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1' },
      error: null,
    });

    const request = createUploadRequest(
      'script.exe',
      'application/octet-stream',
      1024,
    );
    const response = await POST(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('autorisé');
  });

  it('upload une image et retourne l URL', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1' },
      error: null,
    });
    mockFirestoreGet.mockResolvedValue({
      empty: false,
      docs: [{ ref: { update: mockFirestoreUpdate } }],
    });

    const request = createUploadRequest('photo.jpg', 'image/jpeg', 2048);
    const response = await POST(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toContain('storage.googleapis.com');
    expect(mockFileSave).toHaveBeenCalled();
    expect(mockFirestoreUpdate).toHaveBeenCalled();
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'categories.upload',
      expect.objectContaining({ categoryId: 'cat-1' }),
    );
  });

  it('retourne 500 si erreur upload Storage', async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id_categorie: 'cat-1' },
      error: null,
    });
    mockFileSave.mockRejectedValue(new Error('Storage error'));

    const request = createUploadRequest('photo.png', 'image/png', 1024);
    const response = await POST(request, routeParams);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
