import type { CartResponse } from "@/features/cart/cartTypes"
import type { CheckoutAddressForm, CheckoutPaymentForm } from "./checkoutTypes"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CARD_EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/

export function formatCheckoutPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(price)
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function getCardLast4(cardNumber: string): string {
  const digitsOnly = cardNumber.replace(/\D/g, "")

  if (digitsOnly.length < 4) {
    return ""
  }

  return digitsOnly.slice(-4)
}

export function hasCartStockConflict(cart: CartResponse): boolean {
  return cart.lines.some((line) => !line.isAvailable || !line.isStockSufficient)
}

export function getInitialAddressForm(): CheckoutAddressForm {
  return {
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    phone: "",
  }
}

export function getInitialPaymentForm(): CheckoutPaymentForm {
  return {
    cardHolder: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  }
}

export function validateAddressForm(
  values: CheckoutAddressForm,
): Partial<Record<keyof CheckoutAddressForm, string>> {
  const errors: Partial<Record<keyof CheckoutAddressForm, string>> = {}

  if (!values.firstName.trim()) {
    errors.firstName = "required"
  }

  if (!values.lastName.trim()) {
    errors.lastName = "required"
  }

  if (!values.address1.trim()) {
    errors.address1 = "required"
  }

  if (!values.city.trim()) {
    errors.city = "required"
  }

  if (!values.region.trim()) {
    errors.region = "required"
  }

  if (!values.postalCode.trim()) {
    errors.postalCode = "required"
  }

  if (!values.country.trim()) {
    errors.country = "required"
  }

  if (!values.phone.trim()) {
    errors.phone = "required"
  }

  return errors
}

export function validatePaymentForm(
  values: CheckoutPaymentForm,
): Partial<Record<keyof CheckoutPaymentForm, string>> {
  const errors: Partial<Record<keyof CheckoutPaymentForm, string>> = {}

  if (!values.cardHolder.trim()) {
    errors.cardHolder = "required"
  }

  const cardDigits = values.cardNumber.replace(/\D/g, "")

  if (cardDigits.length < 12 || cardDigits.length > 19) {
    errors.cardNumber = "invalid"
  }

  if (!CARD_EXPIRY_PATTERN.test(values.expiry.trim())) {
    errors.expiry = "invalid"
  }

  if (!/^\d{3,4}$/.test(values.cvc.trim())) {
    errors.cvc = "invalid"
  }

  return errors
}

export function hasValidationErrors(
  errors: Record<string, string | undefined>,
): boolean {
  return Object.values(errors).some(Boolean)
}
