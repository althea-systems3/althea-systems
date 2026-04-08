import { describe, expect, it } from "vitest"

import {
  getInitialSignInFormValues,
  hasSignInFormErrors,
  validateSignInForm,
} from "@/features/auth/signInValidation"

describe("signInValidation", () => {
  it("retourne les erreurs required quand champs vides", () => {
    const errors = validateSignInForm(getInitialSignInFormValues())

    expect(errors.email).toBe("required")
    expect(errors.password).toBe("required")
    expect(hasSignInFormErrors(errors)).toBe(true)
  })

  it("retourne invalid sur e-mail mal formate", () => {
    const errors = validateSignInForm({
      email: "email-invalide",
      password: "StrongPass1",
      rememberSession: true,
    })

    expect(errors.email).toBe("invalid")
  })

  it("retourne un formulaire valide sans erreurs", () => {
    const errors = validateSignInForm({
      email: "user@althea.com",
      password: "StrongPass1",
      rememberSession: false,
    })

    expect(errors).toEqual({})
    expect(hasSignInFormErrors(errors)).toBe(false)
  })
})
