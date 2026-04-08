import { describe, expect, it } from "vitest"

import {
  getInitialForgotPasswordFormValues,
  getInitialResetPasswordFormValues,
  hasResetPasswordFormErrors,
  validateForgotPasswordForm,
  validateResetPasswordForm,
} from "@/features/auth/passwordResetValidation"

describe("passwordResetValidation", () => {
  it("valide le formulaire forgot password", () => {
    const emptyErrors = validateForgotPasswordForm(
      getInitialForgotPasswordFormValues(),
    )

    expect(emptyErrors.email).toBe("required")

    const invalidErrors = validateForgotPasswordForm({
      email: "invalide",
    })

    expect(invalidErrors.email).toBe("invalid")

    const validErrors = validateForgotPasswordForm({
      email: "user@althea.com",
    })

    expect(validErrors).toEqual({})
  })

  it("valide le formulaire reset password", () => {
    const emptyErrors = validateResetPasswordForm(
      getInitialResetPasswordFormValues(),
    )

    expect(emptyErrors.password).toBe("required")
    expect(emptyErrors.passwordConfirmation).toBe("required")

    const mismatchErrors = validateResetPasswordForm({
      password: "StrongPass1",
      passwordConfirmation: "StrongPass2",
    })

    expect(mismatchErrors.passwordConfirmation).toBe("mismatch")

    const validErrors = validateResetPasswordForm({
      password: "StrongPass1",
      passwordConfirmation: "StrongPass1",
    })

    expect(validErrors).toEqual({})
    expect(hasResetPasswordFormErrors(validErrors)).toBe(false)
  })
})
