import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetUser = vi.fn()
const mockPatchPaymentMethod = vi.fn()
const mockDeletePaymentMethod = vi.fn()

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
      update: (payload: unknown) => {
        const parsedPayload = payload as Record<string, unknown>

        if (
          Object.keys(parsedPayload).length === 1 &&
          parsedPayload.est_defaut === false
        ) {
          return {
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }
        }

        return {
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: () => mockPatchPaymentMethod(),
              }),
            }),
          }),
        }
      },
      delete: () => ({
        eq: () => ({
          eq: () => ({
            select: () => mockDeletePaymentMethod(),
          }),
        }),
      }),
    }),
  }),
}))

import { DELETE, PATCH } from "@/app/api/account/payment-methods/[id]/route"

function createPatchRequest(body: unknown): Request {
  return new Request(
    "http://localhost:3000/api/account/payment-methods/pm-001",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  )
}

describe("/api/account/payment-methods/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("met a jour un moyen de paiement", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
      error: null,
    })

    mockPatchPaymentMethod.mockResolvedValue({
      data: {
        id_paiement: "pm-001",
        nom_carte: "Carte societe",
        derniers_4_chiffres: "4242",
        date_expiration: "12/30",
        est_defaut: false,
      },
      error: null,
    })

    const response = await PATCH(
      createPatchRequest({
        cardHolder: "Carte societe",
        expiry: "12/30",
      }),
      {
        params: Promise.resolve({ id: "pm-001" }),
      },
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.paymentMethod.cardHolder).toBe("Carte societe")
  })

  it("supprime un moyen de paiement", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
      error: null,
    })

    mockDeletePaymentMethod.mockResolvedValue({
      data: [{ id_paiement: "pm-001" }],
      error: null,
    })

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pm-001" }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe("payment_method_deleted")
  })
})
