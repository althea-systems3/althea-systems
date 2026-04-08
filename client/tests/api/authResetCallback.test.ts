import { beforeEach, describe, expect, it, vi } from "vitest"

const mockVerifyOtp = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
    },
  }),
}))

import { GET } from "@/app/auth/reset/route"

function createRequest(pathnameAndQuery: string): Request {
  return new Request(`http://localhost:3000${pathnameAndQuery}`, {
    method: "GET",
  })
}

describe("GET /auth/reset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirige vers reset avec recovery=invalid si token absent", async () => {
    const response = await GET(
      createRequest("/auth/reset?locale=en&next=/checkout"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/reinitialisation-mot-de-passe?recovery=invalid&next=%2Fcheckout",
    )
  })

  it("redirige vers reset avec recovery=expired si token expire", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: {
        message: "Token has expired",
      },
    })

    const response = await GET(
      createRequest(
        "/auth/reset?token_hash=abc123&type=recovery&locale=en&next=/checkout",
      ),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/reinitialisation-mot-de-passe?recovery=expired&next=%2Fcheckout",
    )
  })

  it("redirige vers reset avec recovery=ready quand verification reussie", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: null,
    })

    const response = await GET(
      createRequest(
        "/auth/reset?token_hash=abc123&type=recovery&locale=en&next=/checkout",
      ),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/reinitialisation-mot-de-passe?recovery=ready&next=%2Fcheckout",
    )
  })

  it("utilise locale par defaut si locale absente", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: null,
    })

    const response = await GET(
      createRequest("/auth/reset?token_hash=abc123&type=recovery"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/reinitialisation-mot-de-passe?recovery=ready",
    )
  })
})
