import { EMAIL_PATTERN, isStrongPassword } from "./signUpValidation"

export type ForgotPasswordFieldName = "email"

export type ForgotPasswordFieldErrorCode = "required" | "invalid"

export type ForgotPasswordFormValues = {
  email: string
}

export type ForgotPasswordFormErrors = Partial<
  Record<ForgotPasswordFieldName, ForgotPasswordFieldErrorCode>
>

export function getInitialForgotPasswordFormValues(): ForgotPasswordFormValues {
  return {
    email: "",
  }
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): ForgotPasswordFormErrors {
  const errors: ForgotPasswordFormErrors = {}

  if (!values.email.trim()) {
    errors.email = "required"
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "invalid"
  }

  return errors
}

export type ResetPasswordFieldName = "password" | "passwordConfirmation"

export type ResetPasswordFieldErrorCode = "required" | "weak" | "mismatch"

export type ResetPasswordFormValues = {
  password: string
  passwordConfirmation: string
}

export type ResetPasswordFormErrors = Partial<
  Record<ResetPasswordFieldName, ResetPasswordFieldErrorCode>
>

export function getInitialResetPasswordFormValues(): ResetPasswordFormValues {
  return {
    password: "",
    passwordConfirmation: "",
  }
}

export function validateResetPasswordForm(
  values: ResetPasswordFormValues,
): ResetPasswordFormErrors {
  const errors: ResetPasswordFormErrors = {}

  if (!values.password) {
    errors.password = "required"
  } else if (!isStrongPassword(values.password)) {
    errors.password = "weak"
  }

  if (!values.passwordConfirmation) {
    errors.passwordConfirmation = "required"
  } else if (values.passwordConfirmation !== values.password) {
    errors.passwordConfirmation = "mismatch"
  }

  return errors
}

export function hasResetPasswordFormErrors(
  errors: ResetPasswordFormErrors,
): boolean {
  return Object.values(errors).some(Boolean)
}
