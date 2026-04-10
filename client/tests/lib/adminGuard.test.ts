import { beforeEach, describe, expect, it, vi } from "vitest"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"

const mockCookieGet = vi.fn()
const mockIsAdminTwoFactorVerified = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: (name: string) => mockCookieGet(name),
    }),
  ),
}))

vi.mock("@/lib/auth/adminTwoFactor", () => ({
  isAdminTwoFactorVerified: (...args: unknown[]) =>
    mockIsAdminTwoFactorVerified(...args),
}))

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}))

import { getCurrentUser } from "@/lib/auth/session"

const mockGetCurrentUser = vi.mocked(getCurrentUser)

describe("verifyAdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieGet.mockReturnValue({ value: "valid-admin-2fa-token" })
    mockIsAdminTwoFactorVerified.mockReturnValue(true)
  })

  it("retourne null quand l utilisateur est admin", async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: { id: "user-1" } as never,
      userProfile: { nom_complet: "Admin", est_admin: true, statut: "actif" },
    })

    const result = await verifyAdminAccess()

    expect(result).toBeNull()
  })

  it("retourne 401 quand aucun utilisateur connecté", async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const result = await verifyAdminAccess()

    expect(result).not.toBeNull()
    const responseBody = await result!.json()
    expect(result!.status).toBe(401)
    expect(responseBody.error).toContain("Authentification requise")
  })

  it("retourne 403 quand l utilisateur n est pas admin", async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: { id: "user-2" } as never,
      userProfile: { nom_complet: "User", est_admin: false, statut: "actif" },
    })

    const result = await verifyAdminAccess()

    expect(result).not.toBeNull()
    const responseBody = await result!.json()
    expect(result!.status).toBe(403)
    expect(responseBody.error).toContain("administrateurs")
  })

  it("retourne 403 quand la verification 2FA admin est absente", async () => {
    mockGetCurrentUser.mockResolvedValue({
      user: { id: "user-3" } as never,
      userProfile: { nom_complet: "Admin", est_admin: true, statut: "actif" },
    })
    mockCookieGet.mockReturnValue(undefined)
    mockIsAdminTwoFactorVerified.mockReturnValue(false)

    const result = await verifyAdminAccess()

    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)

    const responseBody = await result!.json()
    expect(responseBody.error).toContain("2FA")
  })
})
