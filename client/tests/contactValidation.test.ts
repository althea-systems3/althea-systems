import { describe, expect, it } from "vitest"

import {
  getInitialContactFormValues,
  hasContactFormErrors,
  validateContactForm,
} from "@/lib/contact/validation"

describe("contactValidation", () => {
  it("retourne required pour les champs obligatoires vides", () => {
    const errors = validateContactForm(getInitialContactFormValues())

    expect(errors.email).toBe("required")
    expect(errors.subject).toBe("required")
    expect(errors.message).toBe("required")
    expect(hasContactFormErrors(errors)).toBe(true)
  })

  it("retourne invalid pour un e-mail mal forme", () => {
    const errors = validateContactForm({
      email: "email-invalide",
      subject: "Sujet de test",
      message: "Message de test",
    })

    expect(errors.email).toBe("invalid")
  })

  it("retourne un formulaire valide", () => {
    const errors = validateContactForm({
      email: "user@althea.com",
      subject: "Assistance commande",
      message: "Bonjour, pouvez-vous verifier ma commande ?",
    })

    expect(errors).toEqual({})
    expect(hasContactFormErrors(errors)).toBe(false)
  })
})
