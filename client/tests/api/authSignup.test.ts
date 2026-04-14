import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSignUp = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
}))

import { POST } from "@/app/api/auth/signup/route"

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

const VALID_PAYLOAD = {
  firstName: "Lina",
  lastName: "Martin",
  email: "Lina.Martin@Althea.com",
  phone: "+33 612345678",
  password: "StrongPass1",
  acceptTerms: true,
  redirectTo:
    "http://localhost:3000/auth/confirm?locale=en&next=%2Fcheckout&source=checkout",
  source: "checkout",
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
  })

  it("retourne 503 si la configuration Supabase est manquante", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.code).toBe("configuration_missing")
  })

  it("retourne 400 si prenom manquant", async () => {
    const response = await POST(
      createRequest({
        ...VALID_PAYLOAD,
        firstName: "   ",
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe("first_name_required")
  })

  it("retourne 409 si email deja utilise", async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: {
        message: "User already registered",
      },
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.code).toBe("email_already_used")
  })

  it("utilise redirectTo valide et construit metadata attendue", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        session: null,
        user: {
          id: "user-123",
          email: "lina.martin@althea.com",
        },
      },
      error: null,
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.requiresEmailVerification).toBe(true)
    expect(body.isAuthenticated).toBe(false)

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "lina.martin@althea.com",
        password: "StrongPass1",
        options: expect.objectContaining({
          emailRedirectTo:
            "http://localhost:3000/auth/confirm?locale=en&next=%2Fcheckout&source=checkout",
          data: expect.objectContaining({
            nom_complet: "Lina Martin",
            prenom: "Lina",
            nom: "Martin",
            telephone: "+33 612345678",
            signup_source: "checkout",
          }),
        }),
      }),
    )
  })

  it("ignore redirectTo externe et applique le fallback local", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        session: null,
        user: null,
      },
      error: null,
    })

    const response = await POST(
      createRequest({
        ...VALID_PAYLOAD,
        redirectTo: "https://evil.example.com/auth/confirm",
      }),
    )

    expect(response.status).toBe(201)
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: "http://localhost:3000/auth/confirm?locale=fr",
        }),
      }),
    )
  })
})
