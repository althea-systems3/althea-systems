import type {
  AccountAddressForm,
  AccountAddressFormErrors,
  AccountPaymentCreateForm,
  AccountPaymentCreateFormErrors,
  AccountProfile,
  AccountProfileFormErrors,
} from "./accountTypes"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d\s().-]{6,20}$/
const LAST4_PATTERN = /^\d{4}$/
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/

export function formatAccountDate(dateValue: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue))
}

export function formatAccountPrice(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value)
}

export function maskCardLast4(last4: string): string {
  return `**** **** **** ${last4}`
}

export function getInitialProfileForm(): AccountProfile {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  }
}

export function getInitialAddressForm(): AccountAddressForm {
  return {
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
  }
}

export function getInitialPaymentCreateForm(): AccountPaymentCreateForm {
  return {
    stripePaymentId: "",
    cardHolder: "",
    last4: "",
    expiry: "",
    isDefault: false,
  }
}

export function validateProfileForm(
  profile: AccountProfile,
): AccountProfileFormErrors {
  const errors: AccountProfileFormErrors = {}

  if (!profile.firstName.trim()) {
    errors.firstName = "required"
  }

  if (!profile.lastName.trim()) {
    errors.lastName = "required"
  }

  if (!profile.email.trim()) {
    errors.email = "required"
  } else if (!EMAIL_PATTERN.test(profile.email.trim())) {
    errors.email = "invalid"
  }

  if (profile.phone.trim() && !PHONE_PATTERN.test(profile.phone.trim())) {
    errors.phone = "invalid"
  }

  return errors
}

export function validateAddressForm(
  address: AccountAddressForm,
): AccountAddressFormErrors {
  const errors: AccountAddressFormErrors = {}

  if (!address.firstName.trim()) {
    errors.firstName = "required"
  }

  if (!address.lastName.trim()) {
    errors.lastName = "required"
  }

  if (!address.address1.trim()) {
    errors.address1 = "required"
  }

  if (!address.city.trim()) {
    errors.city = "required"
  }

  if (!address.postalCode.trim()) {
    errors.postalCode = "required"
  }

  if (!address.country.trim()) {
    errors.country = "required"
  }

  if (!address.phone.trim()) {
    errors.phone = "required"
  }

  return errors
}

export function validatePaymentCreateForm(
  paymentForm: AccountPaymentCreateForm,
): AccountPaymentCreateFormErrors {
  const errors: AccountPaymentCreateFormErrors = {}

  if (!paymentForm.stripePaymentId.trim()) {
    errors.stripePaymentId = "required"
  }

  if (!paymentForm.cardHolder.trim()) {
    errors.cardHolder = "required"
  }

  if (!LAST4_PATTERN.test(paymentForm.last4.trim())) {
    errors.last4 = "invalid"
  }

  if (!EXPIRY_PATTERN.test(paymentForm.expiry.trim())) {
    errors.expiry = "invalid"
  }

  return errors
}

export function hasFormErrors(
  errors: Record<string, string | undefined>,
): boolean {
  return Object.values(errors).some(Boolean)
}

export function getOrderStatusLabel(status: string): string {
  if (status === "terminee") {
    return "Terminee"
  }

  if (status === "en_cours") {
    return "En cours"
  }

  if (status === "annulee") {
    return "Annulee"
  }

  return "En attente"
}

export function getPaymentStatusLabel(status: string): string {
  if (status === "valide") {
    return "Paiement valide"
  }

  if (status === "echoue") {
    return "Paiement echoue"
  }

  if (status === "rembourse") {
    return "Rembourse"
  }

  return "Paiement en attente"
}
