import { describe, expect, it } from "vitest"
import {
  getCardLast4,
  hasCartStockConflict,
  hasValidationErrors,
  isValidEmail,
  validateAddressForm,
  validatePaymentForm,
} from "@/features/checkout/checkoutUtils"

describe("checkoutUtils", () => {
  it("valide correctement les e-mails", () => {
    expect(isValidEmail("test@example.com")).toBe(true)
    expect(isValidEmail("invalid-email")).toBe(false)
  })

  it("retourne les 4 derniers chiffres de carte", () => {
    expect(getCardLast4("4111 1111 1111 1234")).toBe("1234")
    expect(getCardLast4("12")).toBe("")
  })

  it("detecte les erreurs de validation adresse", () => {
    const errors = validateAddressForm({
      firstName: "",
      lastName: "",
      address1: "",
      address2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
      phone: "",
    })

    expect(
      hasValidationErrors(errors as Record<string, string | undefined>),
    ).toBe(true)
    expect(errors.firstName).toBe("required")
    expect(errors.region).toBe("required")
  })

  it("detecte les erreurs de validation paiement", () => {
    const errors = validatePaymentForm({
      cardHolder: "",
      cardNumber: "123",
      expiry: "99/99",
      cvc: "1",
    })

    expect(
      hasValidationErrors(errors as Record<string, string | undefined>),
    ).toBe(true)
    expect(errors.cardHolder).toBe("required")
    expect(errors.cardNumber).toBe("invalid")
    expect(errors.expiry).toBe("invalid")
    expect(errors.cvc).toBe("invalid")
  })

  it("bloque le checkout quand le panier a un conflit de stock", () => {
    expect(
      hasCartStockConflict({
        cartId: "cart-1",
        lines: [
          {
            id: "line-1",
            productId: "prod-1",
            name: "Produit",
            slug: "produit",
            priceTtc: 100,
            quantity: 2,
            stockQuantity: 1,
            isAvailable: true,
            isStockSufficient: false,
            subtotalTtc: 200,
            imageUrl: null,
          },
        ],
        totalItems: 2,
        totalTtc: 200,
      }),
    ).toBe(true)
  })
})
