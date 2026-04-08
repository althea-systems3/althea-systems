import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetUser = vi.fn()
const mockOrdersQuery = vi.fn()
const mockInvoicesQuery = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "commande") {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockOrdersQuery(),
            }),
          }),
        }
      }

      return {
        select: () => ({
          in: () => mockInvoicesQuery(),
        }),
      }
    },
  }),
}))

import { GET } from "@/app/api/account/orders/route"

describe("GET /api/account/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retourne 401 si utilisateur non authentifie", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "not auth" },
    })

    const response = await GET()

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("session_expired")
  })

  it("retourne les commandes avec facture associee", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
      error: null,
    })

    mockOrdersQuery.mockResolvedValue({
      data: [
        {
          id_commande: "order-001",
          numero_commande: "CMD-1001",
          date_commande: "2026-01-01T10:00:00.000Z",
          montant_ttc: 120,
          statut: "terminee",
          statut_paiement: "valide",
        },
      ],
      error: null,
    })

    mockInvoicesQuery.mockResolvedValue({
      data: [
        {
          id_commande: "order-001",
          numero_facture: "FAC-1001",
          statut: "payee",
          pdf_url: "https://example.com/invoice.pdf",
        },
      ],
      error: null,
    })

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.orders).toHaveLength(1)
    expect(body.orders[0].orderNumber).toBe("CMD-1001")
    expect(body.orders[0].invoice.invoiceNumber).toBe("FAC-1001")
  })
})
