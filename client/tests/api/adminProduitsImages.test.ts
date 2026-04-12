import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockFetchProductImages = vi.fn();
const mockSaveProductImages = vi.fn();

const mockProductExistsQuery = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/firebase/logActivity', () => ({
  logAdminActivity: (...args: unknown[]) => mockLogAdminActivity(...args),
}));

vi.mock('@/lib/admin/productImages', () => ({
  fetchProductImages: (...args: unknown[]) => mockFetchProductImages(...args),
  saveProductImages: (...args: unknown[]) => mockSaveProductImages(...args),
  createProductStoragePath: () => 'products/p1/image.jpg',
  extractStoragePathFromPublicUrl: () => 'products/p1/image.jpg',
}));

vi.mock('@/lib/carousel/validation', () => ({
  isValidImageMimeType: (type: string) =>
    ['image/jpeg', 'image/png', 'image/webp'].includes(type),
  isImageWithinSizeLimit: (size: number) => size <= 5 * 1024 * 1024,
}));

const mockBucketFile = vi.fn().mockReturnValue({
  save: vi.fn().mockResolvedValue(undefined),
  makePublic: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
});

vi.mock('@/lib/firebase/admin', () => ({
  getStorageClient: () => ({
    bucket: () => ({
      name: 'test-bucket',
      file: mockBucketFile,
    }),
  }),
}));

function createChainableQuery(resolveFn: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.eq = self;
  chain.in = self;
  chain.select = () => chain;
  chain.single = resolveFn;
  chain.then = (resolve: (v: unknown) => unknown) => {
    return Promise.resolve(resolveFn()).then(resolve);
  };

  return chain;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'produit') {
        return {
          select: () => createChainableQuery(() => mockProductExistsQuery()),
        };
      }

      return {
        select: () => createChainableQuery(() => ({ data: [], error: null })),
      };
    },
  }),
}));

vi.mock('@/lib/admin/common', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual };
});

import { GET, PATCH, DELETE } from '@/app/api/admin/produits/[id]/images/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const SAMPLE_IMAGES = [
  {
    url: 'https://storage.googleapis.com/test-bucket/products/p1/img1.jpg',
    ordre: 0,
    est_principale: true,
    alt_text: null,
  },
  {
    url: 'https://storage.googleapis.com/test-bucket/products/p1/img2.jpg',
    ordre: 1,
    est_principale: false,
    alt_text: 'Alt text',
  },
];

// --- Tests GET ---

describe('GET /api/admin/produits/[id]/images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockFetchProductImages.mockResolvedValue(SAMPLE_IMAGES);
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await GET(
      new NextRequest('http://localhost/api/admin/produits/p1/images'),
      createRouteContext('p1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne la liste des images du produit', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/admin/produits/p1/images'),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.images).toHaveLength(2);
    expect(body.images[0].est_principale).toBe(true);
  });
});

// --- Tests PATCH ---

describe('PATCH /api/admin/produits/[id]/images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockSaveProductImages.mockResolvedValue(SAMPLE_IMAGES);
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/produits/p1/images', {
        method: 'PATCH',
        body: JSON.stringify({ images: [] }),
        headers: { 'Content-Type': 'application/json' },
      }),
      createRouteContext('p1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si payload images invalide', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/produits/p1/images', {
        method: 'PATCH',
        body: JSON.stringify({ images: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('images_payload_invalid');
  });

  it('sauvegarde les images et log', async () => {
    const reorderedImages = [
      { url: 'https://example.com/img2.jpg', ordre: 0, est_principale: true },
      { url: 'https://example.com/img1.jpg', ordre: 1, est_principale: false },
    ];
    mockSaveProductImages.mockResolvedValue(reorderedImages);

    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/produits/p1/images', {
        method: 'PATCH',
        body: JSON.stringify({ images: reorderedImages }),
        headers: { 'Content-Type': 'application/json' },
      }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.images).toHaveLength(2);
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'products.images.update',
      expect.objectContaining({ productId: 'p1' }),
    );
  });
});

// --- Tests DELETE ---

describe('DELETE /api/admin/produits/[id]/images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockFetchProductImages.mockResolvedValue(SAMPLE_IMAGES);
    mockSaveProductImages.mockResolvedValue([SAMPLE_IMAGES[1]]);
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/produits/p1/images', {
        method: 'DELETE',
        body: JSON.stringify({ url: 'https://example.com/img.jpg' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      createRouteContext('p1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 400 si URL image manquante', async () => {
    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/produits/p1/images', {
        method: 'DELETE',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('image_url_invalid');
  });

  it('retourne 404 si image introuvable', async () => {
    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/produits/p1/images', {
        method: 'DELETE',
        body: JSON.stringify({ url: 'https://example.com/unknown.jpg' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('image_not_found');
  });

  it('supprime l image et log', async () => {
    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/produits/p1/images', {
        method: 'DELETE',
        body: JSON.stringify({ url: SAMPLE_IMAGES[0].url }),
        headers: { 'Content-Type': 'application/json' },
      }),
      createRouteContext('p1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.images).toBeDefined();
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'products.images.delete',
      expect.objectContaining({
        productId: 'p1',
        imageUrl: SAMPLE_IMAGES[0].url,
      }),
    );
  });
});
