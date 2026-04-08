import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

const mockSelectSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSelectSingle(),
        }),
      }),
      update: (data: unknown) => ({
        eq: () => mockUpdate(data),
      }),
    }),
  }),
}));

// --- Import après mocks ---

import { GET } from '@/app/api/auth/reset-password/validate/route';

// --- Helpers ---

function createRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost:3000/api/auth/reset-password/validate?token=${token}`
    : 'http://localhost:3000/api/auth/reset-password/validate';

  return new NextRequest(url, { method: 'GET' });
}

// --- Tests ---

describe('GET /api/auth/reset-password/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ error: null });
  });

  it('retourne 400 si token absent', async () => {
    const response = await GET(createRequest());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Lien invalide ou expiré.');
  });

  it('retourne 400 si token introuvable en base', async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await GET(createRequest('invalid-token'));

    expect(response.status).toBe(400);
  });

  it('retourne 400 si token expiré', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        reset_token_expires_at: '2020-01-01T00:00:00Z',
      },
      error: null,
    });

    const response = await GET(createRequest('expired-token'));

    expect(response.status).toBe(400);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('retourne 200 valid true si token valide', async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id_utilisateur: 'user-001',
        reset_token_expires_at: '2099-12-31T00:00:00Z',
      },
      error: null,
    });

    const response = await GET(createRequest('valid-token'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });
});
