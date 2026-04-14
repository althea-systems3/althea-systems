import { beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks ---

const mockGetUser = vi.fn()
const mockOrdersQuery = vi.fn()
const mockAllDatesQuery = vi.fn()
const mockUserOrderIdsQuery = vi.fn()
const mockProductSearchQuery = vi.fn()
const mockCategoryQuery = vi.fn()
const mockProductCategoriesQuery = vi.fn()
const mockLinesFilterQuery = vi.fn()
const mockOrderLinesQuery = vi.fn()
const mockProductsQuery = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: () => null,
      set: vi.fn(),
      delete: vi.fn(),
      getAll: () => [],
    }),
  ),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "commande") {
        return {
          select: (fields: string, opts?: { count?: string }) => {
            if (fields === "date_commande") {
              return {
                eq: () => mockAllDatesQuery(),
              }
            }

            if (fields === "id_commande") {
              return {
                eq: () => mockUserOrderIdsQuery(),
              }
            }

            // Main query with count
            if (opts?.count === "exact") {
              return {
                eq: () => ({
                  gte: () => ({
                    lt: () => ({
                      eq: () => ({
                        in: () => ({
                          order: () => ({
                            range: () => mockOrdersQuery(),
                          }),
                        }),
                        order: () => ({
                          range: () => mockOrdersQuery(),
                        }),
                      }),
                      in: () => ({
                        order: () => ({
                          range: () => mockOrdersQuery(),
                        }),
                      }),
                      order: () => ({
                        range: () => mockOrdersQuery(),
                      }),
                    }),
                  }),
                  eq: () => ({
                    in: () => ({
                      order: () => ({
                        range: () => mockOrdersQuery(),
                      }),
                    }),
                    order: () => ({
                      range: () => mockOrdersQuery(),
                    }),
                  }),
                  in: () => ({
                    order: () => ({
                      range: () => mockOrdersQuery(),
                    }),
                  }),
                  order: () => ({
                    range: () => mockOrdersQuery(),
                  }),
                }),
              }
            }

            return {}
          },
        }
      }

      if (table === "produit") {
        return {
          select: (fields: string) => {
            if (fields === "id_produit") {
              return {
                ilike: () => mockProductSearchQuery(),
              }
            }

            // Product names fetch
            return {
              in: () => mockProductsQuery(),
            }
          },
        }
      }

      if (table === "ligne_commande") {
        return {
          select: () => ({
            in: () => {
              const result = mockOrderLinesQuery()

              result.in = () => mockLinesFilterQuery()

              return result
            },
          }),
        }
      }

      if (table === "categorie") {
        return {
          select: () => ({
            ilike: () => mockCategoryQuery(),
          }),
        }
      }

      if (table === "produit_categorie") {
        return {
          select: () => ({
            in: () => mockProductCategoriesQuery(),
          }),
        }
      }

      return {}
    },
  }),
}))

// --- Import après mocks ---

import { GET } from "@/app/api/account/orders/history/route"
import { NextRequest } from "next/server"

// --- Helpers ---

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/account/orders/history")

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  return new NextRequest(url)
}

function setupAuthenticatedUser(userId = "user-001") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
}

function setupDefaultMocks() {
  mockAllDatesQuery.mockResolvedValue({
    data: [
      { date_commande: "2025-06-15T10:00:00.000Z" },
      { date_commande: "2026-01-10T10:00:00.000Z" },
    ],
    error: null,
  })

  mockOrdersQuery.mockResolvedValue({
    data: [
      {
        id_commande: "order-001",
        numero_commande: "CMD-2001",
        date_commande: "2026-01-10T10:00:00.000Z",
        montant_ttc: 150,
        statut: "terminee",
        statut_paiement: "valide",
      },
    ],
    error: null,
    count: 1,
  })

  mockOrderLinesQuery.mockResolvedValue({
    data: [
      { id_commande: "order-001", id_produit: "prod-001" },
      { id_commande: "order-001", id_produit: "prod-002" },
    ],
    error: null,
  })

  mockProductsQuery.mockResolvedValue({
    data: [
      { id_produit: "prod-001", nom: "Routeur Pro" },
      { id_produit: "prod-002", nom: "Switch 24 ports" },
    ],
    error: null,
  })
}

// --- Tests ---

describe("GET /api/account/orders/history", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockOrderLinesQuery.mockResolvedValue({ data: [], error: null })
    mockProductsQuery.mockResolvedValue({ data: [], error: null })
    mockLinesFilterQuery.mockResolvedValue({ data: [], error: null })
  })

  it("retourne 401 si utilisateur non authentifie", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "not auth" },
    })

    const response = await GET(createGetRequest())

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("session_expired")
  })

  it("retourne la liste par defaut sans filtres", async () => {
    setupAuthenticatedUser()
    setupDefaultMocks()

    const response = await GET(createGetRequest())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.orders).toHaveLength(1)
    expect(body.orders[0].orderNumber).toBe("CMD-2001")
    expect(body.orders[0].totalTtc).toBe(150)
    expect(body.orders[0].status).toBe("terminee")
    expect(body.orders[0].productSummary).toEqual({
      firstProduct: "Routeur Pro",
      totalCount: 2,
    })
    expect(body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
    })
  })

  it("retourne les annees disponibles", async () => {
    setupAuthenticatedUser()
    setupDefaultMocks()

    const response = await GET(createGetRequest())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.filters.availableYears).toEqual([2026, 2025])
    expect(body.filters.availableStatuses).toEqual([
      "en_attente",
      "en_cours",
      "terminee",
      "annulee",
    ])
  })

  it("retourne un resultat vide", async () => {
    setupAuthenticatedUser()

    mockAllDatesQuery.mockResolvedValue({
      data: [],
      error: null,
    })

    mockOrdersQuery.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    })

    const response = await GET(createGetRequest())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.orders).toHaveLength(0)
    expect(body.pagination.total).toBe(0)
    expect(body.filters.availableYears).toEqual([])
  })

  it("applique le filtre annee", async () => {
    setupAuthenticatedUser()
    setupDefaultMocks()

    const response = await GET(createGetRequest({ year: "2026" }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.orders).toHaveLength(1)
  })

  it("applique le filtre statut", async () => {
    setupAuthenticatedUser()
    setupDefaultMocks()

    const response = await GET(createGetRequest({ status: "terminee" }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.orders).toHaveLength(1)
  })

  it("retourne vide pour une recherche produit sans correspondance", async () => {
    setupAuthenticatedUser()

    mockAllDatesQuery.mockResolvedValue({
      data: [{ date_commande: "2026-01-10T10:00:00.000Z" }],
      error: null,
    })

    mockUserOrderIdsQuery.mockResolvedValue({
      data: [{ id_commande: "order-001" }],
      error: null,
    })

    mockProductSearchQuery.mockResolvedValue({
      data: [],
      error: null,
    })

    const response = await GET(createGetRequest({ search: "inexistant" }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.orders).toHaveLength(0)
    expect(body.pagination.total).toBe(0)
  })

  it("applique la recherche par date", async () => {
    setupAuthenticatedUser()
    setupDefaultMocks()

    const response = await GET(createGetRequest({ search: "2026-01-10" }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.orders).toHaveLength(1)
  })

  it("respecte la pagination page-based", async () => {
    setupAuthenticatedUser()

    mockAllDatesQuery.mockResolvedValue({
      data: [{ date_commande: "2026-01-10T10:00:00.000Z" }],
      error: null,
    })

    mockOrdersQuery.mockResolvedValue({
      data: [],
      error: null,
      count: 25,
    })

    const response = await GET(createGetRequest({ page: "3", limit: "5" }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pagination).toEqual({
      page: 3,
      limit: 5,
      total: 25,
    })
  })
})
