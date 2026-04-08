import type { CartResponse } from "@/features/cart/cartTypes"

export type CheckoutStepId = 1 | 2 | 3 | 4

export type CheckoutAuthMode = "guest" | "signIn" | "signUp"

export type CheckoutAuthUser = {
  id: string
  email: string
  fullName: string
}

export type CheckoutSavedAddress = {
  id: string
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  region: string
  postalCode: string
  country: string
  phone: string
}

export type CheckoutSavedPaymentMethod = {
  id: string
  cardHolder: string
  last4: string
  expiry: string
  isDefault: boolean
}

export type CheckoutAddressForm = {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  region: string
  postalCode: string
  country: string
  phone: string
}

export type CheckoutPaymentForm = {
  cardHolder: string
  cardNumber: string
  expiry: string
  cvc: string
}

export type CheckoutConfirmResponse = {
  orderId: string
  orderNumber: string
  status: "confirmed"
  summary: {
    totalItems: number
    totalHt: number
    totalTva: number
    totalTtc: number
    contactEmail: string
    lines: Array<{
      lineId: string
      productId: string
      name: string
      slug: string
      quantity: number
      unitPriceTtc: number
      unitPriceHt: number
      subtotalTtc: number
      subtotalHt: number
    }>
    address: CheckoutAddressForm
    payment: {
      mode: "saved" | "new"
      cardHolder: string
      last4: string
      expiry: string
    }
  }
}

export type CheckoutState = {
  cart: CartResponse
  currentStep: CheckoutStepId
}
