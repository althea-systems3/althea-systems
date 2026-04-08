import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockSignOut = vi.fn()

const mockCookieStore = {
  getAll: vi.fn(() => []),
  set: vi.fn(),
}

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  }),
}))

import { POST } from "@/app/api/auth/reset-password/route"

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

const VALID_PAYLOAD = {
  password: "StrongPass1",
  passwordConfirmation: "StrongPass1",
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retourne 400 si confirmation differente", async () => {
    const response = await POST(
      createRequest({
        password: "StrongPass1",
        passwordConfirmation: "StrongPass2",
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe("passwords_mismatch")
  })

  it("retourne 400 si mot de passe trop faible", async () => {
    const response = await POST(
      createRequest({
        password: "weak",
        passwordConfirmation: "weak",
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe("password_weak")
  })

  it("retourne 401 si session recovery absente", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("session_expired")
  })

  it("retourne 200 et met a jour le mot de passe", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
        },
      },
      error: null,
    })

    mockUpdateUser.mockResolvedValue({
      error: null,
    })

    mockSignOut.mockResolvedValue({
      error: null,
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe("password_reset_success")

    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: "StrongPass1",
    })
    expect(mockSignOut).toHaveBeenCalled()
  })

  it("mappe l'erreur updateUser session en 401", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
        },
      },
      error: null,
    })

    mockUpdateUser.mockResolvedValue({
      error: {
        message: "Session not found",
      },
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("session_expired")
  })
})
