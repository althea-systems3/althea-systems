import {
  CONTACT_MAX_MESSAGE_LENGTH,
  CONTACT_MAX_SUBJECT_LENGTH,
} from "@/lib/contact/constants"

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ContactFormValues = {
  email: string
  subject: string
  message: string
}

export type ContactFieldName = "email" | "subject" | "message"

export type ContactFieldErrorCode = "required" | "invalid" | "too_long"

export type ContactFormErrors = Partial<
  Record<ContactFieldName, ContactFieldErrorCode>
>

export function normalizeContactText(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

export function getInitialContactFormValues(
  prefill?: Partial<ContactFormValues>,
): ContactFormValues {
  return {
    email: normalizeContactText(prefill?.email),
    subject: normalizeContactText(prefill?.subject),
    message: normalizeContactText(prefill?.message),
  }
}

export function validateContactForm(
  values: ContactFormValues,
): ContactFormErrors {
  const errors: ContactFormErrors = {}

  const normalizedEmail = normalizeContactText(values.email)
  const normalizedSubject = normalizeContactText(values.subject)
  const normalizedMessage = normalizeContactText(values.message)

  if (!normalizedEmail) {
    errors.email = "required"
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = "invalid"
  }

  if (!normalizedSubject) {
    errors.subject = "required"
  } else if (normalizedSubject.length > CONTACT_MAX_SUBJECT_LENGTH) {
    errors.subject = "too_long"
  }

  if (!normalizedMessage) {
    errors.message = "required"
  } else if (normalizedMessage.length > CONTACT_MAX_MESSAGE_LENGTH) {
    errors.message = "too_long"
  }

  return errors
}

export function hasContactFormErrors(errors: ContactFormErrors): boolean {
  return Object.values(errors).some(Boolean)
}
