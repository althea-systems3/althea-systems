import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockVerifyAdminAccess = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAdminActivity = vi.fn();
const mockSendPasswordResetEmail = vi.fn();

const mockUserSelectQuery = vi.fn();
const mockUserUpdateQuery = vi.fn();

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
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
}));

vi.mock('@/lib/auth/token', () => ({
  generateVerificationToken: () => ({
    rawToken: 'raw-token-123',
    tokenHash: 'hashed-token-123',
  }),
  computeResetTokenExpiry: () => new Date('2025-12-31T00:00:00Z'),
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
      update: () => createChainableQuery(() => mockUserUpdateQuery()),
    }),
  }),
}));

import { POST } from '@/app/api/admin/utilisateurs/[id]/reset-password/route';

// --- Helpers ---

function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createPostRequest(): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/utilisateurs/user-1/reset-password',
    { method: 'POST' },
  );
}

// --- Tests ---

describe('POST /api/admin/utilisateurs/[id]/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAccess.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' },
      userProfile: { est_admin: true },
    });
    mockLogAdminActivity.mockResolvedValue(undefined);
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    mockUserSelectQuery.mockReturnValue({
      data: {
        email: 'alice@example.com',
        nom_complet: 'Alice Dupont',
        statut: 'actif',
      },
      error: null,
    });
    mockUserUpdateQuery.mockReturnValue({ error: null });
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
      createPostRequest(),
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
      createPostRequest(),
      createRouteContext('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('retourne 400 si compte inactif', async () => {
    mockUserSelectQuery.mockReturnValue({
      data: {
        email: 'alice@example.com',
        nom_complet: 'Alice Dupont',
        statut: 'inactif',
      },
      error: null,
    });

    const response = await POST(
      createPostRequest(),
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('inactive_account');
  });

  it('envoie le reset avec succès et log', async () => {
    const response = await POST(
      createPostRequest(),
      createRouteContext('user-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'alice@example.com',
        customerName: 'Alice Dupont',
      }),
    );
    expect(mockLogAdminActivity).toHaveBeenCalledWith(
      'admin-1',
      'users.reset_password',
      expect.objectContaining({ userId: 'user-1' }),
    );
  });
});
