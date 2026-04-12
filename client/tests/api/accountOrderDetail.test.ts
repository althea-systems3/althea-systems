import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockOrderQuery = vi.fn();
const mockLinesQuery = vi.fn();
const mockAddressQuery = vi.fn();
const mockInvoiceQuery = vi.fn();
const mockStatusHistoryQuery = vi.fn();

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
    from: (table: string) => {
      if (table === 'commande') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => mockOrderQuery(),
              }),
            }),
          }),
        };
      }

      if (table === 'ligne_commande') {
        return {
          select: () => ({
            eq: () => mockLinesQuery(),
          }),
        };
      }

      if (table === 'adresse') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockAddressQuery(),
            }),
          }),
        };
      }

      if (table === 'facture') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () => mockInvoiceQuery(),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'historique_statut') {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockStatusHistoryQuery(),
            }),
          }),
        };
      }

      return {};
    },
  }),
}));

// --- Import après mocks ---

import { GET } from '@/app/api/account/orders/[numero]/route';

// --- Tests ---

describe('GET /api/account/orders/[numero]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatusHistoryQuery.mockResolvedValue({ data: [], error: null });
  });

  it('retourne 401 si utilisateur non authentifie', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not auth' },
    });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'CMD-1001' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('session_expired');
  });

  it('retourne 400 si numero vide', async () => {
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: '  ' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('order_number_invalid');
  });

  it('retourne 404 si commande introuvable', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockOrderQuery.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'CMD-9999' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('order_not_found');
  });

  it('retourne le detail complet de la commande', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockOrderQuery.mockResolvedValue({
      data: {
        id_commande: 'order-001',
        numero_commande: 'CMD-1001',
        date_commande: '2026-01-15T10:00:00.000Z',
        montant_ht: 100,
        montant_tva: 20,
        montant_ttc: 120,
        statut: 'terminee',
        statut_paiement: 'valide',
        mode_paiement: 'carte',
        paiement_dernier_4: '4242',
        id_adresse: 'addr-001',
      },
      error: null,
    });

    mockLinesQuery.mockResolvedValue({
      data: [
        {
          id_ligne: 'line-001',
          id_produit: 'prod-001',
          quantite: 2,
          prix_unitaire_ht: 50,
          prix_total_ttc: 120,
          produit: { nom: 'Routeur Pro', slug: 'routeur-pro' },
        },
      ],
      error: null,
    });

    mockAddressQuery.mockResolvedValue({
      data: {
        id_adresse: 'addr-001',
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

    mockInvoiceQuery.mockResolvedValue({
      data: {
        id_facture: 'inv-001',
        numero_facture: 'FAC-1001',
        date_emission: '2026-01-15T10:05:00.000Z',
        montant_ttc: 120,
        statut: 'payee',
        pdf_url: 'https://example.com/invoice.pdf',
      },
      error: null,
    });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'CMD-1001' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.order.orderNumber).toBe('CMD-1001');
    expect(body.order.totalHt).toBe(100);
    expect(body.order.totalTtc).toBe(120);
    expect(body.order.paymentLast4).toBe('**** **** **** 4242');

    expect(body.lines).toHaveLength(1);
    expect(body.lines[0].quantity).toBe(2);
    expect(body.lines[0].product.name).toBe('Routeur Pro');

    expect(body.address.firstName).toBe('John');
    expect(body.address.city).toBe('Paris');

    expect(body.invoice.invoiceNumber).toBe('FAC-1001');
    expect(body.invoice.pdfUrl).toBe('https://example.com/invoice.pdf');
  });

  it('retourne null pour adresse et facture absentes', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockOrderQuery.mockResolvedValue({
      data: {
        id_commande: 'order-002',
        numero_commande: 'CMD-1002',
        date_commande: '2026-02-01T10:00:00.000Z',
        montant_ht: 50,
        montant_tva: 10,
        montant_ttc: 60,
        statut: 'en_attente',
        statut_paiement: 'en_attente',
        mode_paiement: null,
        paiement_dernier_4: null,
        id_adresse: null,
      },
      error: null,
    });

    mockLinesQuery.mockResolvedValue({ data: [], error: null });
    mockAddressQuery.mockResolvedValue({ data: null, error: null });
    mockInvoiceQuery.mockResolvedValue({ data: null, error: null });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'CMD-1002' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.order.paymentLast4).toBeNull();
    expect(body.address).toBeNull();
    expect(body.invoice).toBeNull();
    expect(body.lines).toHaveLength(0);
    expect(body.statusHistory).toEqual([]);
  });

  it('retourne l\'historique des statuts', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockOrderQuery.mockResolvedValue({
      data: {
        id_commande: 'order-001',
        numero_commande: 'CMD-1001',
        date_commande: '2026-01-15T10:00:00.000Z',
        montant_ht: 100,
        montant_tva: 20,
        montant_ttc: 120,
        statut: 'terminee',
        statut_paiement: 'valide',
        mode_paiement: 'carte',
        paiement_dernier_4: '4242',
        id_adresse: null,
      },
      error: null,
    });

    mockLinesQuery.mockResolvedValue({ data: [], error: null });
    mockInvoiceQuery.mockResolvedValue({ data: null, error: null });

    mockStatusHistoryQuery.mockResolvedValue({
      data: [
        {
          statut_precedent: null,
          nouveau_statut: 'en_attente',
          date_changement: '2026-01-15T10:00:00.000Z',
        },
        {
          statut_precedent: 'en_attente',
          nouveau_statut: 'en_cours',
          date_changement: '2026-01-16T08:00:00.000Z',
        },
        {
          statut_precedent: 'en_cours',
          nouveau_statut: 'terminee',
          date_changement: '2026-01-17T14:00:00.000Z',
        },
      ],
      error: null,
    });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'CMD-1001' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.statusHistory).toHaveLength(3);
    expect(body.statusHistory[0]).toEqual({
      previousStatus: null,
      newStatus: 'en_attente',
      changedAt: '2026-01-15T10:00:00.000Z',
    });
    expect(body.statusHistory[2].newStatus).toBe('terminee');
  });
});
