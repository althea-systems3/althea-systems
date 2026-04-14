import { describe, expect, it, vi, beforeEach } from "vitest"

// --- Mocks ---

const mockProductSingle = vi.fn()
const mockCartSingle = vi.fn()
const mockCartInsertSingle = vi.fn()
const mockCartLineSingle = vi.fn()
const mockCartLineUpdateSingle = vi.fn()
const mockCartLineInsertSingle = vi.fn()
const mockGetUser = vi.fn()
const mockGetOrCreateCartSessionId = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "produit") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => mockProductSingle(),
              }),
            }),
          }),
        }
      }

      if (table === "panier") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => mockCartSingle(),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => mockCartInsertSingle(),
            }),
          }),
        }
      }

      // table === 'ligne_panier'
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => ({
                single: () => mockCartLineSingle(),
              }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => mockCartLineUpdateSingle(),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => mockCartLineInsertSingle(),
          }),
        }),
      }
    },
  }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({}),
}))

vi.mock("@/lib/auth/cartSession", () => ({
  getOrCreateCartSessionId: () => mockGetOrCreateCartSessionId(),
}))

vi.mock("@/lib/products/constants", () => ({
  MAX_QUANTITY_PER_LINE: 99,
}))

// --- Import après mocks ---

import { POST } from "@/app/api/cart/items/route"

// --- Helpers ---

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const PRODUCT_IN_STOCK = {
  id_produit: "prod-001",
  nom: "Interface Audio",
  slug: "interface-audio",
  quantite_stock: 12,
  statut: "publie",
  prix_ttc: 649.99,
}

function setupAuthMocks() {
  mockGetUser.mockResolvedValue({ data: { user: null } })
  mockGetOrCreateCartSessionId.mockResolvedValue({
    sessionId: "session-guest-001",
    isNewSession: false,
  })
}

// --- Tests ---

describe("POST /api/cart/items", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key"
    process.env.CART_COOKIE_SECRET = "cart-cookie-secret"
  })

  it("retourne 503 si la configuration panier est manquante", async () => {
    delete process.env.CART_COOKIE_SECRET

    const response = await POST(
      createRequest({ id_produit: "prod-001", quantite: 1 }),
    )

    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.code).toBe("configuration_missing")
  })

  it("retourne 400 si id_produit est manquant", async () => {
    const response = await POST(createRequest({ quantite: 1 }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe("id_produit est requis")
  })

  it("retourne 400 si quantite est invalide", async () => {
    const response = await POST(
      createRequest({ id_produit: "prod-001", quantite: 0 }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("quantite")
  })

  it("retourne 404 si le produit est inexistant", async () => {
    mockProductSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    })

    const response = await POST(
      createRequest({ id_produit: "prod-inexistant", quantite: 1 }),
    )

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toContain("inexistant")
  })

  it("retourne 400 si le produit est en rupture", async () => {
    mockProductSingle.mockResolvedValue({
      data: { ...PRODUCT_IN_STOCK, quantite_stock: 0 },
      error: null,
    })

    const response = await POST(
      createRequest({ id_produit: "prod-001", quantite: 1 }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("rupture")
  })

  it("retourne 201 pour un ajout réussi en mode guest", async () => {
    // Arrange
    mockProductSingle.mockResolvedValue({
      data: PRODUCT_IN_STOCK,
      error: null,
    })

    setupAuthMocks()

    mockCartSingle.mockResolvedValue({
      data: { id_panier: "cart-001" },
      error: null,
    })

    mockCartLineSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    })

    const createdLine = {
      id_ligne_panier: "line-001",
      id_panier: "cart-001",
      id_produit: "prod-001",
      quantite: 2,
    }

    mockCartLineInsertSingle.mockResolvedValue({
      data: createdLine,
      error: null,
    })

    // Act
    const response = await POST(
      createRequest({ id_produit: "prod-001", quantite: 2 }),
    )

    // Assert
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.isNewLine).toBe(true)
    expect(body.cartLine.id_produit).toBe("prod-001")
    expect(body.cartLine.quantite).toBe(2)
  })

  it("retourne 200 pour une incrémentation de ligne existante", async () => {
    // Arrange
    mockProductSingle.mockResolvedValue({
      data: PRODUCT_IN_STOCK,
      error: null,
    })

    setupAuthMocks()

    mockCartSingle.mockResolvedValue({
      data: { id_panier: "cart-001" },
      error: null,
    })

    mockCartLineSingle.mockResolvedValue({
      data: {
        id_ligne_panier: "line-001",
        id_panier: "cart-001",
        id_produit: "prod-001",
        quantite: 3,
      },
      error: null,
    })

    const updatedLine = {
      id_ligne_panier: "line-001",
      id_panier: "cart-001",
      id_produit: "prod-001",
      quantite: 5,
    }

    mockCartLineUpdateSingle.mockResolvedValue({
      data: updatedLine,
      error: null,
    })

    // Act
    const response = await POST(
      createRequest({ id_produit: "prod-001", quantite: 2 }),
    )

    // Assert
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.isNewLine).toBe(false)
    expect(body.cartLine.quantite).toBe(5)
  })

  it("retourne 400 si stock insuffisant pour incrémentation", async () => {
    // Arrange - stock de 12, déjà 11 en panier, veut ajouter 2
    mockProductSingle.mockResolvedValue({
      data: PRODUCT_IN_STOCK,
      error: null,
    })

    setupAuthMocks()

    mockCartSingle.mockResolvedValue({
      data: { id_panier: "cart-001" },
      error: null,
    })

    mockCartLineSingle.mockResolvedValue({
      data: {
        id_ligne_panier: "line-001",
        id_panier: "cart-001",
        id_produit: "prod-001",
        quantite: 11,
      },
      error: null,
    })

    // Act
    const response = await POST(
      createRequest({ id_produit: "prod-001", quantite: 2 }),
    )

    // Assert
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("Stock insuffisant")
    expect(body.availableStock).toBe(12)
    expect(body.currentCartQuantity).toBe(11)
  })
})
