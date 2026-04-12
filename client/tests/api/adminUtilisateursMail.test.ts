import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockSendAdminDirectEmail = vi.fn();

const mockUserSelectQuery = vi.fn();

vi.mock('@/lib/auth/adminGuard', () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/firebase/logActivity', () => ({
  logAdminActivity: (...args: unknown[]) => mockLogAdminActivity(...args),
}));

vi.mock('@/lib/auth/email', () => ({
  sendAdminDirectEmail: (...args: unknown[]) =>
    mockSendAdminDirectEmail(...args),
}));

vi.mock('@/lib/admin/common', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual };
});

function createChainableQuery(resolveFn: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.eq = self;
  chain.select = () => chain;
  chain.single = () =>
    Promise.resolve(resolveFn()).then((v) => v);
  chain.then = (resolve: (v: unknown) => unknown) => {
    return Promise.resolve(resolveFn()).then(resolve);
  };

  return chain;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => createChainableQuery(() => mockUserSelectQuery()),
    }),
  }),
}));

import { POST } from '@/app/api/admin/utilisateurs/[id]/mail/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/utilisateurs/user-1/mail',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// --- Tests ---

describe('POST /api/admin/utilisateurs/[id]/mail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockSendAdminDirectEmail.mockResolvedValue(undefined);
    mockUserSelectQuery.mockReturnValue({
      data: {
        email: 'alice@example.com',
        nom_complet: 'Alice Dupont',
        statut: 'actif',
      },
      error: null,
    });
  });

  it('retourne 401 si non authentifié', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 },
      ),
    );

    const response = await POST(
      createPostRequest({ subject: 'Test', content: 'Contenu test' }),
      createRouteContext('user-1'),
    );

    expect(response.status).toBe(401);
  });

  it('retourne 404 si utilisateur introuvable', async () => {
    mockUserSelectQuery.mockReturnValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await POST(
      createPostRequest({ subject: 'Test', content: 'Contenu test' }),
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne 400 si sujet trop court', async () => {
    const response = await POST(
      createPostRequest({ subject: 'AB', content: 'Contenu test' }),
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('subject_invalid');
  });

  it('retourne 400 si contenu trop court', async () => {
    const response = await POST(
      createPostRequest({ subject: 'Test sujet', content: 'AB' }),
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('content_invalid');
  });

  it('envoie le mail avec succès et log', async () => {
    const response = await POST(
      createPostRequest({
        subject: 'Sujet important',
        content: 'Bonjour, ceci est un message admin.',
      }),
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSendAdminDirectEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'alice@example.com',
        customerName: 'Alice Dupont',
        subject: 'Sujet important',
        message: 'Bonjour, ceci est un message admin.',
      }),
    );
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'users.send_email',
      expect.objectContaining({
        userId: 'user-1',
        subject: 'Sujet important',
      }),
    );
  });
});
