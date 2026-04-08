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

import { GET } from "@/app/auth/confirm/route"

function createRequest(pathnameAndQuery: string): Request {
  return new Request(`http://localhost:3000${pathnameAndQuery}`, {
    method: "GET",
  })
}

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirige vers inscription avec verification=invalid si token absent", async () => {
    const response = await GET(
      createRequest("/auth/confirm?locale=en&next=/checkout&source=checkout"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/inscription?verification=invalid&next=%2Fcheckout&source=checkout",
    )
  })

  it("redirige vers inscription avec verification=expired si token expire", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: {
        message: "Token has expired",
      },
    })

    const response = await GET(
      createRequest(
        "/auth/confirm?token_hash=abc123&type=email&locale=en&next=/checkout&source=checkout",
      ),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/inscription?verification=expired&next=%2Fcheckout&source=checkout",
    )
  })

  it("redirige vers checkout localise quand verification reussie depuis checkout", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: null,
    })

    const response = await GET(
      createRequest(
        "/auth/confirm?token_hash=abc123&type=email&locale=en&next=/checkout&source=checkout",
      ),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/checkout?verification=success",
    )
  })

  it("redirige vers mes-parametres par defaut apres verification reussie", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: null,
    })

    const response = await GET(
      createRequest("/auth/confirm?token_hash=abc123&type=email&locale=fr"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/mes-parametres?verification=success",
    )
  })
})
