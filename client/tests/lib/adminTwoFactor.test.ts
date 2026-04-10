import { describe, expect, it } from "vitest"

import {
  createAdminTwoFactorChallenge,
  createAdminTwoFactorVerifiedToken,
  isAdminTwoFactorVerified,
  isValidAdminTwoFactorCode,
  normalizeAdminTwoFactorCode,
  verifyAdminTwoFactorChallenge,
} from "@/lib/auth/adminTwoFactor"

describe("adminTwoFactor helpers", () => {
  it("génère un challenge avec un code à 6 chiffres", () => {
    const challenge = createAdminTwoFactorChallenge("admin-1")

    expect(challenge.token.length).toBeGreaterThan(20)
    expect(isValidAdminTwoFactorCode(challenge.code)).toBe(true)
  })

  it("valide un code correct", () => {
    const challenge = createAdminTwoFactorChallenge("admin-1")

    const result = verifyAdminTwoFactorChallenge({
      token: challenge.token,
      userId: "admin-1",
      code: challenge.code,
    })

    expect(result.status).toBe("verified")
  })

  it("verrouille le challenge après plusieurs codes invalides", () => {
    const challenge = createAdminTwoFactorChallenge("admin-1")
    const wrongCode = challenge.code === "000000" ? "999999" : "000000"

    let token = challenge.token

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = verifyAdminTwoFactorChallenge({
        token,
        userId: "admin-1",
        code: wrongCode,
      })

      if (attempt < 5) {
        expect(result.status).toBe("invalid_code")
        expect(result.nextToken).not.toBeNull()
        token = result.nextToken as string
        continue
      }

      expect(result.status).toBe("locked")
      expect(result.nextToken).toBeNull()
    }
  })

  it("accepte uniquement les tokens 2FA signés pour le bon admin", () => {
    const verifiedToken = createAdminTwoFactorVerifiedToken("admin-1")

    expect(isAdminTwoFactorVerified(verifiedToken, "admin-1")).toBe(true)
    expect(isAdminTwoFactorVerified(verifiedToken, "admin-2")).toBe(false)
    expect(isAdminTwoFactorVerified(null, "admin-1")).toBe(false)
  })

  it("normalise et valide le format du code", () => {
    expect(normalizeAdminTwoFactorCode(" 12 34 56 ")).toBe("123456")
    expect(isValidAdminTwoFactorCode("123456")).toBe(true)
    expect(isValidAdminTwoFactorCode("12345")).toBe(false)
    expect(isValidAdminTwoFactorCode("12a456")).toBe(false)
  })
})
