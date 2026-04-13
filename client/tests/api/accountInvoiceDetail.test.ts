import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockInvoiceQuery = vi.fn();
const mockOrderQuery = vi.fn();

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
      if (table === 'facture') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockInvoiceQuery(),
            }),
          }),
        };
      }

      if (table === 'commande') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockOrderQuery(),
            }),
          }),
        };
      }

      return {};
    },
  }),
}));

// --- Import après mocks ---

import { GET } from '@/app/api/account/invoices/[numero]/route';

// --- Tests ---

describe('GET /api/account/invoices/[numero]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 400 si numero vide', async () => {
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: '  ' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('invoice_number_invalid');
  });

  it('retourne 401 si utilisateur non authentifie', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not auth' },
    });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'FAC-1001' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('session_expired');
  });

  it('retourne 404 si facture introuvable', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockInvoiceQuery.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'FAC-9999' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('invoice_not_found');
  });

  it('retourne 404 si facture appartient a un autre utilisateur', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockInvoiceQuery.mockResolvedValue({
      data: {
        id_facture: 'inv-001',
        numero_facture: 'FAC-1001',
        id_commande: 'order-001',
        date_emission: '2026-01-15T10:00:00.000Z',
        montant_ttc: 120,
        statut: 'payee',
        pdf_url: null,
      },
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
        id_utilisateur: 'user-999',
      },
      error: null,
    });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'FAC-1001' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('invoice_not_found');
  });

  it('retourne le detail complet de la facture', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });

    mockInvoiceQuery.mockResolvedValue({
      data: {
        id_facture: 'inv-001',
        numero_facture: 'FAC-1001',
        id_commande: 'order-001',
        date_emission: '2026-01-15T10:05:00.000Z',
        montant_ttc: 120,
        statut: 'payee',
        pdf_url: 'https://example.com/invoice.pdf',
      },
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
        id_utilisateur: 'user-001',
      },
      error: null,
    });

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ numero: 'FAC-1001' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.invoice.invoiceNumber).toBe('FAC-1001');
    expect(body.invoice.totalTtc).toBe(120);
    expect(body.invoice.pdfUrl).toBe('https://example.com/invoice.pdf');

    expect(body.order.orderNumber).toBe('CMD-1001');
    expect(body.order.totalHt).toBe(100);
    expect(body.order.totalTtc).toBe(120);
    expect(body.order.status).toBe('terminee');
  });
});
