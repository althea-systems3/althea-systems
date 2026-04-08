import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetUser = vi.fn()
const mockUpdateAddress = vi.fn()
const mockDeleteAddress = vi.fn()

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
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => mockUpdateAddress(),
            }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => ({
            select: () => mockDeleteAddress(),
          }),
        }),
      }),
    }),
  }),
}))

import { DELETE, PUT } from "@/app/api/account/addresses/[id]/route"

function createPutRequest(body: unknown): Request {
  return new Request(
    "http://localhost:3000/api/account/addresses/address-001",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  )
}

describe("/api/account/addresses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("met a jour une adresse", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
      error: null,
    })

    mockUpdateAddress.mockResolvedValue({
      data: {
        id_adresse: "address-001",
        prenom: "John",
        nom: "Doe",
        adresse_1: "2 rue de Lyon",
        adresse_2: null,
        ville: "Lyon",
        code_postal: "69000",
        pays: "France",
        telephone: "+33 6 11 11 11 11",
      },
      error: null,
    })

    const response = await PUT(
      createPutRequest({
        firstName: "John",
        lastName: "Doe",
        address1: "2 rue de Lyon",
        address2: "",
        city: "Lyon",
        postalCode: "69000",
        country: "France",
        phone: "+33 6 11 11 11 11",
      }),
      {
        params: Promise.resolve({ id: "address-001" }),
      },
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.address.city).toBe("Lyon")
  })

  it("supprime une adresse", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-001" } },
      error: null,
    })

    mockDeleteAddress.mockResolvedValue({
      data: [{ id_adresse: "address-001" }],
      error: null,
    })

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "address-001" }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe("address_deleted")
  })
})
