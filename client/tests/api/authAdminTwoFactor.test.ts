import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockVerifyCsrf = vi.fn()
const mockSendAdminTwoFactorEmail = vi.fn()
const mockCreateChallenge = vi.fn()
const mockNormalizeCode = vi.fn()
const mockIsValidCode = vi.fn()
const mockVerifyChallenge = vi.fn()
const mockCreateVerifiedToken = vi.fn()
const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(() => []),
}

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

vi.mock("@/lib/auth/csrf", () => ({
  verifyCsrf: (...args: unknown[]) => mockVerifyCsrf(...args),
}))

vi.mock("@/lib/auth/email", () => ({
  sendAdminTwoFactorEmail: (...args: unknown[]) =>
    mockSendAdminTwoFactorEmail(...args),
}))

vi.mock("@/lib/auth/adminTwoFactor", () => ({
  createAdminTwoFactorChallenge: (...args: unknown[]) =>
    mockCreateChallenge(...args),
  normalizeAdminTwoFactorCode: (...args: unknown[]) =>
    mockNormalizeCode(...args),
  isValidAdminTwoFactorCode: (...args: unknown[]) => mockIsValidCode(...args),
  verifyAdminTwoFactorChallenge: (...args: unknown[]) =>
    mockVerifyChallenge(...args),
  createAdminTwoFactorVerifiedToken: (...args: unknown[]) =>
    mockCreateVerifiedToken(...args),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockProfileSingle(),
        }),
      }),
    }),
  }),
}))

import { POST as challengePost } from "@/app/api/auth/admin-2fa/challenge/route"
import { POST as verifyPost } from "@/app/api/auth/admin-2fa/verify/route"

function createRequest(urlPath: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${urlPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
      host: "localhost:3000",
    },
    body: JSON.stringify(body),
  })
}

describe("admin 2FA auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockVerifyCsrf.mockReturnValue(null)
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-1",
          email: "admin@althea.com",
        },
      },
      error: null,
    })
    mockProfileSingle.mockResolvedValue({
      data: {
        est_admin: true,
        nom_complet: "Admin Root",
      },
      error: null,
    })

    mockCreateChallenge.mockReturnValue({
      code: "123456",
      token: "challenge-token",
      expiresAt: Date.now() + 10 * 60 * 1000,
    })
    mockSendAdminTwoFactorEmail.mockResolvedValue(undefined)

    mockNormalizeCode.mockImplementation((value: unknown) =>
      typeof value === "string" ? value.trim() : "",
    )
    mockIsValidCode.mockReturnValue(true)
    mockVerifyChallenge.mockReturnValue({
      status: "verified",
      nextToken: null,
    })
    mockCreateVerifiedToken.mockReturnValue("verified-token")

    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "admin_2fa_challenge") {
        return { value: "challenge-token" }
      }

      return undefined
    })
  })

  it("envoie un challenge 2FA pour un admin connecté", async () => {
    const response = await challengePost(
      createRequest("/api/auth/admin-2fa/challenge", {}),
    )

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.requiresAdminTwoFactor).toBe(true)

    expect(mockCreateChallenge).toHaveBeenCalledWith("admin-1")
    expect(mockSendAdminTwoFactorEmail).toHaveBeenCalledTimes(1)
    expect(
      mockCookieStore.set.mock.calls.some(
        ([cookieName]) => cookieName === "admin_2fa_challenge",
      ),
    ).toBe(true)
  })

  it("valide un code 2FA et marque la session admin comme vérifiée", async () => {
    const response = await verifyPost(
      createRequest("/api/auth/admin-2fa/verify", { code: "123456" }),
    )

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.verified).toBe(true)

    expect(mockVerifyChallenge).toHaveBeenCalledWith({
      token: "challenge-token",
      userId: "admin-1",
      code: "123456",
    })

    expect(
      mockCookieStore.set.mock.calls.some(
        ([cookieName]) => cookieName === "admin_2fa_verified",
      ),
    ).toBe(true)
  })

  it("retourne 400 quand le code est invalide", async () => {
    mockVerifyChallenge.mockReturnValue({
      status: "invalid_code",
      nextToken: "challenge-token-next",
    })

    const response = await verifyPost(
      createRequest("/api/auth/admin-2fa/verify", { code: "654321" }),
    )

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.code).toBe("invalid_code")

    expect(
      mockCookieStore.set.mock.calls.some(
        ([cookieName, cookieValue]) =>
          cookieName === "admin_2fa_challenge" &&
          cookieValue === "challenge-token-next",
      ),
    ).toBe(true)
  })

  it("retourne 429 quand le challenge est verrouillé", async () => {
    mockVerifyChallenge.mockReturnValue({
      status: "locked",
      nextToken: null,
    })

    const response = await verifyPost(
      createRequest("/api/auth/admin-2fa/verify", { code: "999999" }),
    )

    expect(response.status).toBe(429)

    const body = await response.json()
    expect(body.code).toBe("too_many_attempts")
  })
})
