import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSignInWithPassword = vi.fn()

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
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

import { POST } from "@/app/api/auth/signin/route"

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieStore.getAll.mockReturnValue([])
  })

  it("retourne 400 si email invalide", async () => {
    const response = await POST(
      createRequest({
        email: "email-invalide",
        password: "StrongPass1",
        rememberSession: true,
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe("email_invalid")
  })

  it("retourne 401 si identifiants invalides", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: null,
      },
      error: {
        message: "Invalid login credentials",
      },
    })

    const response = await POST(
      createRequest({
        email: "user@althea.com",
        password: "WrongPassword1",
        rememberSession: false,
      }),
    )

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("invalid_credentials")
  })

  it("retourne 403 si e-mail non verifie", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: null,
      },
      error: {
        message: "Email not confirmed",
      },
    })

    const response = await POST(
      createRequest({
        email: "user@althea.com",
        password: "StrongPass1",
        rememberSession: true,
      }),
    )

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.code).toBe("email_not_verified")
  })

  it("retourne 200 et applique remember me desactive en cookie session", async () => {
    mockCookieStore.getAll.mockReturnValue([
      {
        name: "sb-project-auth-token",
        value: "token-value",
      },
    ])

    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "User@Althea.com",
        },
      },
      error: null,
    })

    const response = await POST(
      createRequest({
        email: "User@Althea.com",
        password: "StrongPass1",
        rememberSession: false,
      }),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.isAuthenticated).toBe(true)
    expect(body.rememberSession).toBe(false)

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "user@althea.com",
      password: "StrongPass1",
    })

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "althea_remember_session",
      "false",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
      }),
    )

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "sb-project-auth-token",
      "token-value",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
      }),
    )
  })
})
