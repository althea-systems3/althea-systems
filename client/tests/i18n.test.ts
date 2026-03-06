import { describe, expect, it } from "vitest"
import { defaultLocale, isRtlLocale, locales } from "../lib/i18n"

describe("i18n config", () => {
  it("contains expected locales", () => {
    expect(locales).toEqual(["fr", "en", "ar", "he"])
    expect(defaultLocale).toBe("fr")
  })

  it("marks Arabic and Hebrew as RTL", () => {
    expect(isRtlLocale("ar")).toBe(true)
    expect(isRtlLocale("he")).toBe(true)
    expect(isRtlLocale("fr")).toBe(false)
  })
})
