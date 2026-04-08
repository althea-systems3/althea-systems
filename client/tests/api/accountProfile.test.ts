import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockProfileSelectSingle = vi.fn()
const mockProfileUpdateEq = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockProfileSelectSingle(),
        }),
      }),
      update: () => ({
        eq: () => mockProfileUpdateEq(),
      }),
    }),
  }),
}))

import { GET, PUT } from "@/app/api/account/profile/route"

function createPutRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/account/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

describe("/api/account/profile", () => {
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

  it("retourne le profil mappe", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-001",
          email: "john@example.com",
          user_metadata: {
            prenom: "John",
            nom: "Doe",
            telephone: "+33 6 00 00 00 00",
          },
        },
      },
      error: null,
    })

    mockProfileSelectSingle.mockResolvedValue({
      data: {
        nom_complet: "John Doe",
        email: "john@example.com",
      },
      error: null,
    })

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.profile.firstName).toBe("John")
    expect(body.profile.lastName).toBe("Doe")
    expect(body.profile.email).toBe("john@example.com")
  })

  it("met a jour le profil avec succes", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-001",
          email: "john@example.com",
          user_metadata: {},
        },
      },
      error: null,
    })

    mockUpdateUser.mockResolvedValue({ error: null })
    mockProfileUpdateEq.mockResolvedValue({ error: null })

    const response = await PUT(
      createPutRequest({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+33 6 00 00 00 00",
      }),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe("profile_updated")
  })
})
