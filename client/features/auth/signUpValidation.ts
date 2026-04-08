export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PASSWORD_MIN_LENGTH = 8

export type SignUpFieldName =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "password"
  | "passwordConfirmation"
  | "acceptTerms"

export type SignUpFieldErrorCode =
  | "required"
  | "invalid"
  | "weak"
  | "mismatch"
  | "notAccepted"

export type SignUpFormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  passwordConfirmation: string
  acceptTerms: boolean
}

export type SignUpFormErrors = Partial<
  Record<SignUpFieldName, SignUpFieldErrorCode>
>

export function getInitialSignUpFormValues(): SignUpFormValues {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirmation: "",
    acceptTerms: false,
  }
}

export function isStrongPassword(passwordValue: string): boolean {
  const hasLowercaseCharacter = /[a-z]/.test(passwordValue)
  const hasUppercaseCharacter = /[A-Z]/.test(passwordValue)
  const hasNumericCharacter = /\d/.test(passwordValue)

  return (
    passwordValue.length >= PASSWORD_MIN_LENGTH &&
    hasLowercaseCharacter &&
    hasUppercaseCharacter &&
    hasNumericCharacter
  )
}

export function validateSignUpForm(values: SignUpFormValues): SignUpFormErrors {
  const errors: SignUpFormErrors = {}

  if (!values.firstName.trim()) {
    errors.firstName = "required"
  }

  if (!values.lastName.trim()) {
    errors.lastName = "required"
  }

  if (!values.email.trim()) {
    errors.email = "required"
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "invalid"
  }

  if (values.phone.trim() && !/^[+\d\s().-]{8,20}$/.test(values.phone.trim())) {
    errors.phone = "invalid"
  }

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

  if (!values.acceptTerms) {
    errors.acceptTerms = "notAccepted"
  }

  return errors
}

export function hasSignUpFormErrors(errors: SignUpFormErrors): boolean {
  return Object.values(errors).some(Boolean)
}
