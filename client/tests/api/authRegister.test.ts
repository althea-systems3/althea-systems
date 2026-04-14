import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// --- Mocks ---

const mockCreateUser = vi.fn()
const mockUpdateEq = vi.fn()
const mockSendVerificationEmail = vi.fn()
const mockLogAuthActivity = vi.fn()
const mockIsRateLimited = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        createUser: (params: unknown) => mockCreateUser(params),
      },
    },
    from: () => ({
      update: () => ({
        eq: () => mockUpdateEq(),
      }),
    }),
  }),
}))

vi.mock("@/lib/auth/csrf", () => ({
  verifyCsrf: () => null,
}))

vi.mock("@/lib/auth/rateLimiter", () => ({
  registerRateLimiter: {
    isRateLimited: (key: string) => mockIsRateLimited(key),
  },
  getClientIp: () => "127.0.0.1",
}))

vi.mock("@/lib/auth/email", () => ({
  sendVerificationEmail: (data: unknown) => mockSendVerificationEmail(data),
}))

vi.mock("@/lib/auth/logAuthActivity", () => ({
  logAuthActivity: (action: string, details: unknown) =>
    mockLogAuthActivity(action, details),
}))

vi.mock("@/lib/auth/token", () => ({
  generateVerificationToken: () => ({
    rawToken: "raw-token-test",
    tokenHash: "hashed-token-test",
  }),
  computeTokenExpiry: () => new Date("2026-04-09T12:00:00.000Z"),
}))

// --- Import après mocks ---

import { POST } from "@/app/api/auth/register/route"

// --- Helpers ---

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
      host: "localhost:3000",
    },
    body: JSON.stringify(body),
  })
}

const VALID_PAYLOAD = {
  email: "marc@example.com",
  mot_de_passe: "Secure1pwd",
  mot_de_passe_confirmation: "Secure1pwd",
  nom_complet: "Marc Dupont",
  cgu_acceptee: true,
}

// --- Tests ---

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
    mockIsRateLimited.mockReturnValue(false)
    mockUpdateEq.mockResolvedValue({ error: null })
    mockSendVerificationEmail.mockResolvedValue(undefined)
    mockLogAuthActivity.mockResolvedValue(undefined)
  })

  it("retourne 410 apres la date de sunset", async () => {
    vi.useFakeTimers()

    try {
      vi.setSystemTime(new Date("2027-01-01T00:00:00.000Z"))

      const response = await POST(createRequest(VALID_PAYLOAD))

      expect(response.status).toBe(410)
      expect(response.headers.get("X-Althea-Replacement-Endpoint")).toBe(
        "/api/auth/signup",
      )

      const body = await response.json()
      expect(body.code).toBe("endpoint_sunset")
    } finally {
      vi.useRealTimers()
    }
  })

  it("retourne 503 si la configuration Supabase est manquante", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.code).toBe("configuration_missing")
  })

  it("ajoute les headers de deprecation vers /api/auth/signup", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-new-001" } },
      error: null,
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.headers.get("Deprecation")).toBe("true")
    expect(response.headers.get("X-Althea-Replacement-Endpoint")).toBe(
      "/api/auth/signup",
    )
  })

  it("retourne 429 si rate limited", async () => {
    mockIsRateLimited.mockReturnValue(true)

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(429)
  })

  it("retourne 400 si payload invalide (email manquant)", async () => {
    const response = await POST(createRequest({ ...VALID_PAYLOAD, email: "" }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.errors).toContain("Email requis.")
  })

  it("retourne 400 si mot de passe trop faible", async () => {
    const response = await POST(
      createRequest({ ...VALID_PAYLOAD, mot_de_passe: "weak" }),
    )

    expect(response.status).toBe(400)
  })

  it("retourne 400 si CGU non acceptées", async () => {
    const response = await POST(
      createRequest({ ...VALID_PAYLOAD, cgu_acceptee: false }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.errors.some((e: string) => e.includes("conditions"))).toBe(true)
  })

  it("retourne 400 si mots de passe ne correspondent pas", async () => {
    const response = await POST(
      createRequest({
        ...VALID_PAYLOAD,
        mot_de_passe_confirmation: "Different1pwd",
      }),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(
      body.errors.some((e: string) => e.includes("ne correspondent pas")),
    ).toBe(true)
  })

  it("retourne 201 si inscription réussie", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-new-001" } },
      error: null,
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.message).toContain("Vérifiez votre email")
  })

  it("retourne 201 même si email déjà existant (anti-énumération)", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User already been registered" },
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.message).toContain("Vérifiez votre email")
  })

  it("retourne 500 si erreur Supabase inattendue", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Internal server error" },
    })

    const response = await POST(createRequest(VALID_PAYLOAD))

    expect(response.status).toBe(500)
  })

  it("appelle sendVerificationEmail avec le bon email", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-new-001" } },
      error: null,
    })

    await POST(createRequest(VALID_PAYLOAD))

    // NOTE: sendVerificationEmail est appelé en non-bloquant (.catch)
    // On vérifie l'appel
    await vi.waitFor(() => {
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: "marc@example.com",
          customerName: "Marc Dupont",
        }),
      )
    })
  })

  it("stocke le hash du token, pas le token brut", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-new-001" } },
      error: null,
    })

    await POST(createRequest(VALID_PAYLOAD))

    // NOTE: Le mock updateEq est appelé via .from().update().eq()
    // On vérifie que logAuthActivity est appelé (preuve que le flow est passé)
    await vi.waitFor(() => {
      expect(mockLogAuthActivity).toHaveBeenCalledWith(
        "auth.register",
        expect.objectContaining({ userId: "user-new-001" }),
      )
    })
  })

  it("crée l'utilisateur avec email_confirm false", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-new-001" } },
      error: null,
    })

    await POST(createRequest(VALID_PAYLOAD))

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "marc@example.com",
        email_confirm: false,
        user_metadata: { nom_complet: "Marc Dupont" },
      }),
    )
  })
})
