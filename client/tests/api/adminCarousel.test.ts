import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();

const mockSupabaseOrder = vi.fn();
const mockSupabaseCount = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseInsertSingle = vi.fn();

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
        // count query (head: true)
        const hasHeadOption = args.length > 1
          && typeof args[1] === 'object'
          && args[1] !== null
          && 'head' in args[1];

        if (hasHeadOption) {
          return mockSupabaseCount();
        }

        return {
          eq: () => ({ order: mockSupabaseOrder }),
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

import { GET, POST } from '@/app/api/admin/carousel/route';
import { NextRequest } from 'next/server';

// --- Helpers ---

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/admin/carousel', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Tests GET ---

describe('GET /api/admin/carousel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 401 si utilisateur non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json({ error: 'Authentification requise.' }, { status: 401 }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentification requise.');
  });

  it('retourne la liste des slides triés par ordre', async () => {
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockSupabaseOrder.mockResolvedValue({
      data: [
        { id_slide: 's1', titre: 'Slide 1', ordre: 1 },
        { id_slide: 's2', titre: 'Slide 2', ordre: 2 },
      ],
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slides).toHaveLength(2);
    expect(body.slides[0].id_slide).toBe('s1');
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

describe('POST /api/admin/carousel', () => {
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

  it('retourne 400 si titre manquant', async () => {
    const request = createPostRequest({ texte: 'un texte' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('titre');
  });

  it('retourne 400 si limite de slides atteinte', async () => {
    mockSupabaseCount.mockReturnValue({ count: 3, error: null });

    const request = createPostRequest({ titre: 'Nouveau slide' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Limite');
  });

  it('retourne 400 si lien de redirection invalide', async () => {
    mockSupabaseCount.mockReturnValue({ count: 0, error: null });

    const request = createPostRequest({
      titre: 'Slide valide',
      lien_redirection: 'javascript:alert(1)',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('lien');
  });

  it('crée un slide et retourne 201', async () => {
    mockSupabaseCount.mockReturnValue({ count: 1, error: null });
    mockSupabaseSingle.mockResolvedValue({
      data: { ordre: 1 },
    });
    mockSupabaseInsertSingle.mockResolvedValue({
      data: {
        id_slide: 'new-1',
        titre: 'Mon slide',
        texte: null,
        lien_redirection: '/produits',
        ordre: 2,
        actif: false,
        image_url: null,
      },
      error: null,
    });

    const request = createPostRequest({
      titre: 'Mon slide',
      lien_redirection: '/produits',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.slide.id_slide).toBe('new-1');
    expect(body.slide.titre).toBe('Mon slide');
    expect(mockFirestoreAdd).toHaveBeenCalled();
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'carousel.create',
      expect.objectContaining({ slideId: 'new-1' }),
    );
  });

  it('retourne 500 si erreur insertion base', async () => {
    mockSupabaseCount.mockReturnValue({ count: 0, error: null });
    mockSupabaseSingle.mockResolvedValue({ data: null });
    mockSupabaseInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    });

    const request = createPostRequest({ titre: 'Slide test' });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
