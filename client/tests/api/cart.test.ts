import { describe, expect, it, vi, beforeEach } from "vitest"

// --- Mocks ---

const mockGetUser = vi.fn()
const mockGetCartSessionId = vi.fn()
const mockCartSingle = vi.fn()
const mockCartLines = vi.fn()
const mockFirestoreGet = vi.fn()

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({}),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: { getUser: () => mockGetUser() },
  }),
}))

vi.mock("@/lib/auth/cartSession", () => ({
  getCartSessionId: () => mockGetCartSessionId(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "panier") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => mockCartSingle(),
              }),
            }),
          }),
        }
      }

      // table === 'ligne_panier'
      return {
        select: () => ({
          eq: () => mockCartLines(),
        }),
      }
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

vi.mock("@/lib/top-produits/constants", () => ({
  FIRESTORE_IMAGES_PRODUITS: "ImagesProduits",
}))

// --- Import après mocks ---

import { GET } from "@/app/api/cart/route"

// --- Tests ---

describe("GET /api/cart", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
    process.env.CART_COOKIE_SECRET = "cart-cookie-secret"
    mockFirestoreGet.mockResolvedValue({ docs: [] })
  })

  it("retourne 503 si la configuration panier est manquante", async () => {
    delete process.env.CART_COOKIE_SECRET

    const response = await GET()

    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.code).toBe("configuration_missing")
  })

  it("retourne un panier vide si aucun panier trouvé", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockGetCartSessionId.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.cartId).toBeNull()
    expect(body.lines).toEqual([])
    expect(body.totalItems).toBe(0)
    expect(body.totalTtc).toBe(0)
  })

  it("retourne les lignes avec détails produit et totaux calculés", async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-001" } } })

    mockCartSingle.mockResolvedValue({
      data: { id_panier: "cart-001" },
    })

    mockCartLines.mockResolvedValue({
      data: [
        {
          id_ligne_panier: "line-001",
          id_panier: "cart-001",
          id_produit: "prod-001",
          quantite: 2,
          produit: {
            nom: "Interface Audio DSP-24",
            slug: "interface-audio-dsp-24",
            prix_ttc: 649.99,
            quantite_stock: 12,
            statut: "publie",
          },
        },
        {
          id_ligne_panier: "line-002",
          id_panier: "cart-001",
          id_produit: "prod-002",
          quantite: 1,
          produit: {
            nom: "Switch Industriel",
            slug: "switch-industriel",
            prix_ttc: 899.0,
            quantite_stock: 6,
            statut: "publie",
          },
        },
      ],
      error: null,
    })

    mockFirestoreGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            produit_id: "prod-001",
            images: [{ url: "/img/audio.webp", est_principale: true }],
          }),
        },
      ],
    })

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.cartId).toBe("cart-001")
    expect(body.lines).toHaveLength(2)

    expect(body.lines[0].name).toBe("Interface Audio DSP-24")
    expect(body.lines[0].quantity).toBe(2)
    expect(body.lines[0].subtotalTtc).toBe(1299.98)
    expect(body.lines[0].isAvailable).toBe(true)
    expect(body.lines[0].isStockSufficient).toBe(true)
    expect(body.lines[0].imageUrl).toBe("/img/audio.webp")

    expect(body.lines[1].imageUrl).toBeNull()

    expect(body.totalItems).toBe(3)
    expect(body.totalTtc).toBe(2198.98)
  })

  it("marque isStockSufficient false si quantité dépasse le stock", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-001" } } })

    mockCartSingle.mockResolvedValue({
      data: { id_panier: "cart-001" },
    })

    mockCartLines.mockResolvedValue({
      data: [
        {
          id_ligne_panier: "line-001",
          id_panier: "cart-001",
          id_produit: "prod-001",
          quantite: 15,
          produit: {
            nom: "Produit Stock Limité",
            slug: "produit-stock-limite",
            prix_ttc: 100,
            quantite_stock: 5,
            statut: "publie",
          },
        },
      ],
      error: null,
    })

    const response = await GET()
    const body = await response.json()

    expect(body.lines[0].isStockSufficient).toBe(false)
    expect(body.lines[0].isAvailable).toBe(true)
    expect(body.lines[0].stockQuantity).toBe(5)
  })

  it("exclut les lignes dont le produit n est plus publié", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-001" } } })

    mockCartSingle.mockResolvedValue({
      data: { id_panier: "cart-001" },
    })

    mockCartLines.mockResolvedValue({
      data: [
        {
          id_ligne_panier: "line-001",
          id_panier: "cart-001",
          id_produit: "prod-001",
          quantite: 1,
          produit: {
            nom: "Produit Publié",
            slug: "produit-publie",
            prix_ttc: 100,
            quantite_stock: 10,
            statut: "publie",
          },
        },
        {
          id_ligne_panier: "line-002",
          id_panier: "cart-001",
          id_produit: "prod-002",
          quantite: 1,
          produit: {
            nom: "Produit Brouillon",
            slug: "produit-brouillon",
            prix_ttc: 200,
            quantite_stock: 5,
            statut: "brouillon",
          },
        },
      ],
      error: null,
    })

    const response = await GET()
    const body = await response.json()

    expect(body.lines).toHaveLength(1)
    expect(body.lines[0].name).toBe("Produit Publié")
    expect(body.totalTtc).toBe(100)
  })

  it("fonctionne en mode guest avec session cookie", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockGetCartSessionId.mockResolvedValue("session-guest-123")

    mockCartSingle.mockResolvedValue({
      data: { id_panier: "cart-guest-001" },
    })

    mockCartLines.mockResolvedValue({
      data: [
        {
          id_ligne_panier: "line-001",
          id_panier: "cart-guest-001",
          id_produit: "prod-001",
          quantite: 3,
          produit: {
            nom: "Micro Conference",
            slug: "micro-conference",
            prix_ttc: 299,
            quantite_stock: 25,
            statut: "publie",
          },
        },
      ],
      error: null,
    })

    const response = await GET()
    const body = await response.json()

    expect(body.cartId).toBe("cart-guest-001")
    expect(body.lines).toHaveLength(1)
    expect(body.totalItems).toBe(3)
    expect(body.totalTtc).toBe(897)
  })
})
