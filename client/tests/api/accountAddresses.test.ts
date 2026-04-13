import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockAddressesQuery = vi.fn();
const mockInsertAddress = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: () => null,
      set: vi.fn(),
      delete: vi.fn(),
      getAll: () => [],
    }),
  ),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => mockAddressesQuery(),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => mockInsertAddress(),
        }),
      }),
    }),
  }),
}));

// --- Import après mocks ---

import { GET, POST } from '@/app/api/account/addresses/route';

// --- Helpers ---

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/account/addresses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

// --- Tests ---

describe('/api/account/addresses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 401 si utilisateur non authentifie', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not auth' },
    });

    const response = await GET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('session_expired');
  });

  it('retourne 400 si payload adresse invalide', async () => {
    const response = await POST(
      createPostRequest({
        firstName: '',
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('first_name_required');
  });

  it('cree une adresse avec succes', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockInsertAddress.mockResolvedValue({
      data: {
        id_adresse: 'address-001',
        prenom: 'John',
        nom: 'Doe',
        adresse_1: '1 rue de Paris',
        adresse_2: null,
        ville: 'Paris',
        code_postal: '75000',
        pays: 'France',
        telephone: '+33 6 00 00 00 00',
      },
      error: null,
    });

    const response = await POST(
      createPostRequest({
        firstName: 'John',
        lastName: 'Doe',
        address1: '1 rue de Paris',
        address2: '',
        city: 'Paris',
        postalCode: '75000',
        country: 'France',
        phone: '+33 6 00 00 00 00',
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.address.id).toBe('address-001');
  });
});
