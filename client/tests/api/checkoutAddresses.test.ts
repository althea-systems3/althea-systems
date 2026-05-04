import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockSelectAddresses = vi.fn();
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
          order: () => mockSelectAddresses(),
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

import { GET, POST } from '@/app/api/checkout/addresses/route';

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/checkout/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_ADDRESS = {
  firstName: 'Jean',
  lastName: 'Dupont',
  address1: '12 rue de la Paix',
  address2: 'Apt 5',
  city: 'Paris',
  postalCode: '75001',
  country: 'France',
  phone: '+33612345678',
};

describe('/api/checkout/addresses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it("retourne tableau vide si utilisateur non connecté (guest)", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.addresses).toEqual([]);
    });

    it('retourne les adresses du user connecté', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null,
      });
      mockSelectAddresses.mockResolvedValue({
        data: [
          {
            id_adresse: 'addr-001',
            prenom: 'Jean',
            nom: 'Dupont',
            adresse_1: '12 rue de la Paix',
            adresse_2: null,
            ville: 'Paris',
            code_postal: '75001',
            pays: 'France',
            telephone: '+33612345678',
          },
        ],
        error: null,
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.addresses).toHaveLength(1);
      expect(body.addresses[0]).toMatchObject({
        id: 'addr-001',
        firstName: 'Jean',
        address2: '',
      });
    });

    it("retourne tableau vide si erreur DB (best-effort)", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-002' } },
        error: null,
      });
      mockSelectAddresses.mockResolvedValue({
        data: null,
        error: { message: 'db error' },
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.addresses).toEqual([]);
    });
  });

  describe('POST', () => {
    it('retourne 401 si utilisateur non authentifié', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'no session' },
      });

      const response = await POST(createPostRequest(VALID_ADDRESS));

      expect(response.status).toBe(401);
    });

    it('retourne 400 si firstName manquant', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-003' } },
        error: null,
      });

      const response = await POST(
        createPostRequest({ ...VALID_ADDRESS, firstName: '' }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/firstName/);
    });

    it('retourne 400 si phone manquant', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-004' } },
        error: null,
      });

      const response = await POST(
        createPostRequest({ ...VALID_ADDRESS, phone: '' }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/phone/);
    });

    it('crée l\'adresse avec succès et retourne 201', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-005' } },
        error: null,
      });
      mockInsertAddress.mockResolvedValue({
        data: {
          id_adresse: 'addr-new',
          prenom: 'Jean',
          nom: 'Dupont',
          adresse_1: '12 rue de la Paix',
          adresse_2: 'Apt 5',
          ville: 'Paris',
          code_postal: '75001',
          pays: 'France',
          telephone: '+33612345678',
        },
        error: null,
      });

      const response = await POST(createPostRequest(VALID_ADDRESS));

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.address).toMatchObject({
        id: 'addr-new',
        firstName: 'Jean',
        city: 'Paris',
      });
    });

    it("retourne 500 si insert échoue", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-006' } },
        error: null,
      });
      mockInsertAddress.mockResolvedValue({
        data: null,
        error: { message: 'db error' },
      });

      const response = await POST(createPostRequest(VALID_ADDRESS));

      expect(response.status).toBe(500);
    });
  });
});
