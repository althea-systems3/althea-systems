import { beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyAdminAccess } from '@/lib/auth/adminGuard';

const mockCookieGet = vi.fn();
const mockIsAdminTwoFactorVerified = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: (name: string) => mockCookieGet(name),
    }),
  ),
}));

vi.mock('@/lib/auth/adminTwoFactor', () => ({
  isAdminTwoFactorVerified: (...args: unknown[]) =>
    mockIsAdminTwoFactorVerified(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/session';

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe('Sécurité — contrôle d accès admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuse l accès sans session (401)', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await verifyAdminAccess();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('refuse l accès pour un utilisateur non-admin (403)', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'user-1' } as never,
      userProfile: {
        nom_complet: 'User',
        est_admin: false,
        statut: 'actif',
        langue_preferee: 'fr',
      },
    });

    const result = await verifyAdminAccess();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('refuse l accès admin sans cookie 2FA (403)', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' } as never,
      userProfile: {
        nom_complet: 'Admin',
        est_admin: true,
        statut: 'actif',
        langue_preferee: 'fr',
      },
    });
    mockCookieGet.mockReturnValue(undefined);
    mockIsAdminTwoFactorVerified.mockReturnValue(false);

    const result = await verifyAdminAccess();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('autorise l accès admin avec session + est_admin + 2FA valide', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'admin-1' } as never,
      userProfile: {
        nom_complet: 'Admin',
        est_admin: true,
        statut: 'actif',
        langue_preferee: 'fr',
      },
    });
    mockCookieGet.mockReturnValue({ value: 'valid-token' });
    mockIsAdminTwoFactorVerified.mockReturnValue(true);

    const result = await verifyAdminAccess();

    expect(result).toBeNull();
  });
});
