import { beforeEach, describe, expect, it, vi } from "vitest"

const mockResetPasswordForEmail = vi.fn()

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
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}))

import { POST } from "@/app/api/auth/forgot-password/route"

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retourne 400 si e-mail invalide", async () => {
    const response = await POST(
      createRequest({
        email: "email-invalide",
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe("email_invalid")
  })

  it("retourne un succes neutre et utilise redirectTo valide", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: null,
    })

    const response = await POST(
      createRequest({
        email: "User@Althea.com",
        redirectTo:
          "http://localhost:3000/auth/reset?locale=en&next=%2Fcheckout",
      }),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe("password_reset_email_sent")

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("user@althea.com", {
      redirectTo: "http://localhost:3000/auth/reset?locale=en&next=%2Fcheckout",
    })
  })

  it("ignore redirectTo externe et applique le fallback local", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: null,
    })

    const response = await POST(
      createRequest({
        email: "user@althea.com",
        redirectTo: "https://evil.example.com/auth/reset",
      }),
    )

    expect(response.status).toBe(200)

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("user@althea.com", {
      redirectTo: "http://localhost:3000/auth/reset?locale=fr",
    })
  })

  it("retourne 429 si limitation de debit", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: {
        message: "Rate limit exceeded",
      },
    })

    const response = await POST(
      createRequest({
        email: "user@althea.com",
      }),
    )

    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.code).toBe("rate_limited")
  })
})
