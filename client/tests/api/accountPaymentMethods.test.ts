import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetUser = vi.fn()
const mockSelectPaymentMethods = vi.fn()
const mockResetDefaultMethods = vi.fn()
const mockInsertPaymentMethod = vi.fn()

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
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => mockSelectPaymentMethods(),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => mockResetDefaultMethods(),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => mockInsertPaymentMethod(),
        }),
      }),
    }),
  }),
}))

import { GET, POST } from "@/app/api/account/payment-methods/route"

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/account/payment-methods", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

describe("/api/account/payment-methods", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retourne 400 si les 4 derniers chiffres sont invalides", async () => {
    const response = await POST(
      createPostRequest({
        stripePaymentId: "pm_123",
        cardHolder: "Carte pro",
        last4: "12",
        expiry: "12/30",
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe("last4_invalid")
  })

  it("retourne les moyens de paiement", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
      error: null,
    })

    mockSelectPaymentMethods.mockResolvedValue({
      data: [
        {
          id_paiement: "pm-001",
          nom_carte: "Carte pro",
          derniers_4_chiffres: "4242",
          date_expiration: "12/30",
          est_defaut: true,
        },
      ],
      error: null,
    })

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.paymentMethods[0].last4).toBe("4242")
  })

  it("cree un moyen de paiement", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
      error: null,
    })

    mockInsertPaymentMethod.mockResolvedValue({
      data: {
        id_paiement: "pm-001",
        nom_carte: "Carte pro",
        derniers_4_chiffres: "4242",
        date_expiration: "12/30",
        est_defaut: false,
      },
      error: null,
    })

    const response = await POST(
      createPostRequest({
        stripePaymentId: "pm_123",
        cardHolder: "Carte pro",
        last4: "4242",
        expiry: "12/30",
      }),
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.paymentMethod.id).toBe("pm-001")
  })
})
