import { describe, expect, it, vi } from 'vitest';

import { verifyAdminAccess } from '@/lib/auth/adminGuard';

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/session';

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe('verifyAdminAccess', () => {
  it('retourne null quand l utilisateur est admin', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'user-1' } as never,
      userProfile: { nom_complet: 'Admin', est_admin: true, statut: 'actif' },
    });

    const result = await verifyAdminAccess();

    expect(result).toBeNull();
  });

  it('retourne 401 quand aucun utilisateur connecté', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await verifyAdminAccess();

    expect(result).not.toBeNull();
    const responseBody = await result!.json();
    expect(result!.status).toBe(401);
    expect(responseBody.error).toContain('Authentification requise');
  });

  it('retourne 403 quand l utilisateur n est pas admin', async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: { id: 'user-2' } as never,
      userProfile: { nom_complet: 'User', est_admin: false, statut: 'actif' },
    });

    const result = await verifyAdminAccess();

    expect(result).not.toBeNull();
    const responseBody = await result!.json();
    expect(result!.status).toBe(403);
    expect(responseBody.error).toContain('administrateurs');
  });
});
