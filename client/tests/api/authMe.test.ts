import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();
const mockProfileEq = vi.fn();
const mockProfileSingle = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: () => ({ name: 'remember_me', value: '1' }),
    }),
  ),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: mockProfileSelect,
    }),
  }),
}));

import { GET } from '@/app/api/auth/me/route';

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileSelect.mockReturnValue({ eq: mockProfileEq });
    mockProfileEq.mockReturnValue({ single: mockProfileSingle });
  });

  it('retourne isAuthenticated false quand aucun utilisateur connecté', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(responseBody.isAuthenticated).toBe(false);
    expect(responseBody.user).toBeNull();
  });

  it('retourne le profil utilisateur quand connecté', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@althea.com',
          user_metadata: { locale: 'en' },
        },
      },
      error: null,
    });

    mockProfileSingle.mockResolvedValue({
      data: {
        nom_complet: 'Jean Dupont',
        est_admin: false,
        statut: 'actif',
        email_verifie: true,
        langue_preferee: 'en',
      },
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(responseBody.isAuthenticated).toBe(true);
    expect(responseBody.user.email).toBe('test@althea.com');
    expect(responseBody.user.nomComplet).toBe('Jean Dupont');
    expect(responseBody.user.isAdmin).toBe(false);
    expect(responseBody.user.locale).toBe('en');
  });

  it('utilise fr comme locale par défaut si non définie', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-456',
          email: 'autre@althea.com',
          user_metadata: {},
        },
      },
      error: null,
    });

    mockProfileSingle.mockResolvedValue({ data: null });

    const response = await GET();
    const responseBody = await response.json();

    expect(responseBody.user.locale).toBe('fr');
  });
});
