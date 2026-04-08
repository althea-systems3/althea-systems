import { describe, expect, it } from "vitest"

import {
  getInitialSignUpFormValues,
  hasSignUpFormErrors,
  isStrongPassword,
  validateSignUpForm,
} from "@/features/auth/signUpValidation"

describe("signUpValidation", () => {
  it("retourne les erreurs required pour les champs obligatoires vides", () => {
    const errors = validateSignUpForm(getInitialSignUpFormValues())

    expect(errors.firstName).toBe("required")
    expect(errors.lastName).toBe("required")
    expect(errors.email).toBe("required")
    expect(errors.password).toBe("required")
    expect(errors.passwordConfirmation).toBe("required")
    expect(errors.acceptTerms).toBe("notAccepted")
    expect(hasSignUpFormErrors(errors)).toBe(true)
  })

  it("retourne les erreurs metier sur email, telephone et confirmation", () => {
    const errors = validateSignUpForm({
      firstName: "Lina",
      lastName: "Martin",
      email: "email-invalide",
      phone: "12",
      password: "StrongPass1",
      passwordConfirmation: "StrongPass2",
      acceptTerms: true,
    })

    expect(errors.email).toBe("invalid")
    expect(errors.phone).toBe("invalid")
    expect(errors.passwordConfirmation).toBe("mismatch")
  })

  it("retourne un formulaire valide sans erreurs", () => {
    const errors = validateSignUpForm({
      firstName: "Lina",
      lastName: "Martin",
      email: "lina@althea.com",
      phone: "+33 612345678",
      password: "StrongPass1",
      passwordConfirmation: "StrongPass1",
      acceptTerms: true,
    })

    expect(errors).toEqual({})
    expect(hasSignUpFormErrors(errors)).toBe(false)
    expect(isStrongPassword("StrongPass1")).toBe(true)
    expect(isStrongPassword("weak")).toBe(false)
  })
})
