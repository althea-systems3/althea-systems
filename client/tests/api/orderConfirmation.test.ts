import { describe, expect, it, vi, beforeEach } from "vitest"

// --- Mocks ---

const mockGetUser = vi.fn()
const mockSelectOrderSingle = vi.fn()
const mockSelectOrderLines = vi.fn()
const mockSelectProducts = vi.fn()
const mockSelectInvoiceSingle = vi.fn()
const mockSelectAddressSingle = vi.fn()
const mockFirestoreGet = vi.fn()

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({}),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: { getUser: () => mockGetUser() },
  }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "commande") {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockSelectOrderSingle(),
            }),
          }),
        }
      }

      if (table === "ligne_commande") {
        return {
          select: () => ({
            eq: () => mockSelectOrderLines(),
          }),
        }
      }

      if (table === "produit") {
        return {
          select: () => ({
            in: () => mockSelectProducts(),
          }),
        }
      }

      if (table === "facture") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => mockSelectInvoiceSingle(),
              }),
            }),
          }),
        }
      }

      if (table === "adresse") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => mockSelectAddressSingle(),
              }),
            }),
          }),
        }
      }

      return {}
    },
  }),
}))

vi.mock("@/lib/firebase/admin", () => ({
  getFirestoreClient: () => ({
    collection: () => ({
      where: () => ({
        get: () => mockFirestoreGet(),
      }),
    }),
  }),
}))

// --- Import après mocks ---

import { GET } from "@/app/api/orders/[numero]/confirmation/route"
import { NextRequest } from "next/server"

// --- Helpers ---

function createRequest(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/orders/ALT-202604-TESTTEST/confirmation",
  )
}

function createContext(numero: string) {
  return { params: Promise.resolve({ numero }) }
}

const VALID_ORDER = {
  id_commande: "order-001",
  numero_commande: "ALT-202604-TESTTEST",
  id_utilisateur: "user-001",
  id_adresse: "addr-001",
  mode_paiement: "carte",
  paiement_dernier_4: "4242",
  statut: "en_cours",
  statut_paiement: "valide",
  montant_ht: 16.66,
  montant_tva: 3.34,
  montant_ttc: 20.0,
  date_commande: "2026-04-08T12:00:00.000Z",
}

// --- Tests ---

describe("GET /api/orders/[numero]/confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSelectAddressSingle.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    })
  })

  it("retourne 404 si commande introuvable", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
    })

    mockSelectOrderSingle.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    })

    const response = await GET(createRequest(), createContext("ALT-UNKNOWN"))

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe("Commande introuvable")
  })

  it("retourne 403 si utilisateur non propriétaire", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-other" } },
    })

    mockSelectOrderSingle.mockResolvedValue({
      data: VALID_ORDER,
      error: null,
    })

    const response = await GET(
      createRequest(),
      createContext("ALT-202604-TESTTEST"),
    )

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe("Accès refusé")
  })

  it("retourne 401 si non authentifié", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    })

    const response = await GET(
      createRequest(),
      createContext("ALT-202604-TESTTEST"),
    )

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("session_expired")
  })

  it("retourne la confirmation complète avec lignes et facture", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
    })

    mockSelectOrderSingle.mockResolvedValue({
      data: VALID_ORDER,
      error: null,
    })

    mockSelectOrderLines.mockResolvedValue({
      data: [
        {
          id_produit: "prod-001",
          quantite: 2,
          prix_unitaire_ht: 8.33,
          prix_total_ttc: 20.0,
        },
      ],
      error: null,
    })

    mockSelectProducts.mockResolvedValue({
      data: [
        {
          id_produit: "prod-001",
          nom: "Produit Test",
          slug: "produit-test",
        },
      ],
      error: null,
    })

    mockFirestoreGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            produit_id: "prod-001",
            images: [
              { url: "https://img.example.com/prod.jpg", est_principale: true },
            ],
          }),
        },
      ],
    })

    mockSelectInvoiceSingle.mockResolvedValue({
      data: {
        numero_facture: "FAC-202604-ABCDEFGH",
        statut: "payee",
        pdf_url: "https://storage.example.com/invoices/FAC-202604-ABCDEFGH.pdf",
      },
      error: null,
    })

    mockSelectAddressSingle.mockResolvedValue({
      data: {
        prenom: "Jean",
        nom: "Dupont",
        adresse_1: "10 rue de la Paix",
        adresse_2: "Batiment A",
        ville: "Paris",
        region: "Ile-de-France",
        code_postal: "75001",
        pays: "France",
        telephone: "0601020304",
      },
      error: null,
    })

    const response = await GET(
      createRequest(),
      createContext("ALT-202604-TESTTEST"),
    )

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.order.orderNumber).toBe("ALT-202604-TESTTEST")
    expect(body.order.totalTtc).toBe(20.0)
    expect(body.order.status).toBe("en_cours")

    expect(body.lines).toHaveLength(1)
    expect(body.lines[0].productName).toBe("Produit Test")
    expect(body.lines[0].imageUrl).toBe("https://img.example.com/prod.jpg")
    expect(body.lines[0].quantity).toBe(2)

    expect(body.paymentMethod.mode).toBe("carte")
    expect(body.paymentMethod.last4).toBe("4242")
    expect(body.billingAddress.city).toBe("Paris")
    expect(body.billingAddress.address2).toBe("Batiment A")

    expect(body.invoice.invoiceNumber).toBe("FAC-202604-ABCDEFGH")
    expect(body.invoice.pdfUrl).toContain("FAC-202604-ABCDEFGH.pdf")
  })

  it("retourne null pour facture si aucune facture", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
    })

    mockSelectOrderSingle.mockResolvedValue({
      data: VALID_ORDER,
      error: null,
    })

    mockSelectOrderLines.mockResolvedValue({
      data: [],
      error: null,
    })

    mockSelectProducts.mockResolvedValue({
      data: [],
      error: null,
    })

    mockFirestoreGet.mockResolvedValue({ docs: [] })

    mockSelectInvoiceSingle.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    })

    const response = await GET(
      createRequest(),
      createContext("ALT-202604-TESTTEST"),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.invoice).toBeNull()
    expect(body.lines).toEqual([])
  })
})
