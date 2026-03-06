import { describe, expect, it, vi, beforeEach } from 'vitest';

// NOTE: On mock cookies() de next/headers car il n'existe pas en dehors de Next.js
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import {
  getCartSessionId,
  getOrCreateCartSessionId,
  clearCartSession,
} from '@/lib/auth/cartSession';

describe('cartSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CART_COOKIE_SECRET = 'test-secret-key-for-unit-tests-32ch';
  });

  describe('getCartSessionId', () => {
    it('retourne null quand aucun cookie existe', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const sessionId = await getCartSessionId();

      expect(sessionId).toBeNull();
    });

    it('retourne null quand la signature du cookie est invalide', async () => {
      mockCookieStore.get.mockReturnValue({
        value: 'fake-session-id.signature-invalide',
      });

      const sessionId = await getCartSessionId();

      expect(sessionId).toBeNull();
    });
  });

  describe('getOrCreateCartSessionId', () => {
    it('crée une nouvelle session quand aucun cookie existe', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const { sessionId, isNewSession } = await getOrCreateCartSessionId();

      expect(sessionId).toBeTruthy();
      expect(isNewSession).toBe(true);
      expect(mockCookieStore.set).toHaveBeenCalledOnce();
    });

    it('réutilise la session existante quand le cookie est valide', async () => {
      // Arrange : créer d'abord une session valide
      mockCookieStore.get.mockReturnValue(undefined);
      const { sessionId: originalSessionId } = await getOrCreateCartSessionId();

      // Récupérer la valeur signée passée à set()
      const signedCookieValue = mockCookieStore.set.mock.calls[0][1];

      vi.clearAllMocks();
      mockCookieStore.get.mockReturnValue({ value: signedCookieValue });

      // Act
      const { sessionId, isNewSession } = await getOrCreateCartSessionId();

      // Assert
      expect(sessionId).toBe(originalSessionId);
      expect(isNewSession).toBe(false);
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it('définit le cookie avec les bonnes options de sécurité', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      await getOrCreateCartSessionId();

      const cookieOptions = mockCookieStore.set.mock.calls[0][2];

      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.sameSite).toBe('lax');
      expect(cookieOptions.path).toBe('/');
      expect(cookieOptions.maxAge).toBe(60 * 60 * 24 * 30);
    });
  });

  describe('clearCartSession', () => {
    it('supprime le cookie de session panier', async () => {
      await clearCartSession();

      expect(mockCookieStore.delete).toHaveBeenCalledWith('cart_session_id');
    });
  });
});
