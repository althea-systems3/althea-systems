export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SignInFieldName = "email" | "password"

export type SignInFieldErrorCode = "required" | "invalid"

export type SignInFormValues = {
  email: string
  password: string
  rememberSession: boolean
}

export type SignInFormErrors = Partial<
  Record<SignInFieldName, SignInFieldErrorCode>
>

export function getInitialSignInFormValues(): SignInFormValues {
  return {
    email: "",
    password: "",
    rememberSession: false,
  }
}

export function validateSignInForm(values: SignInFormValues): SignInFormErrors {
  const errors: SignInFormErrors = {}

  if (!values.email.trim()) {
    errors.email = "required"
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "invalid"
  }

  if (!values.password.trim()) {
    errors.password = "required"
  }

  return errors
}

export function hasSignInFormErrors(errors: SignInFormErrors): boolean {
  return Object.values(errors).some(Boolean)
}
