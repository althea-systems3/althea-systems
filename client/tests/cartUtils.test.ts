import { describe, expect, it, vi } from "vitest"
import {
  CART_COUNT_STORAGE_KEY,
  CART_UPDATED_EVENT_NAME,
} from "@/features/layout/layoutConstants"
import {
  computeCartTotalsFromLines,
  extractCartLineErrorInfo,
  normalizeCartResponse,
  syncCartLayoutState,
} from "@/features/cart/cartUtils"

describe("cartUtils", () => {
  it("calcule correctement les totaux depuis les lignes", () => {
    const totals = computeCartTotalsFromLines([
      {
        id: "line-1",
        productId: "prod-1",
        name: "Produit 1",
        slug: "produit-1",
        priceTtc: 99.99,
        quantity: 2,
        stockQuantity: 10,
        isAvailable: true,
        isStockSufficient: true,
        subtotalTtc: 199.98,
        imageUrl: null,
      },
      {
        id: "line-2",
        productId: "prod-2",
        name: "Produit 2",
        slug: "produit-2",
        priceTtc: 10,
        quantity: 3,
        stockQuantity: 10,
        isAvailable: true,
        isStockSufficient: true,
        subtotalTtc: 30,
        imageUrl: null,
      },
    ])

    expect(totals.totalItems).toBe(5)
    expect(totals.totalTtc).toBe(229.98)
  })

  it("normalise une réponse panier partielle et filtre les lignes invalides", () => {
    const payload = {
      cartId: "cart-1",
      lines: [
        {
          id: "line-1",
          productId: "prod-1",
          name: "Produit",
          slug: "produit",
          priceTtc: 49.9,
          quantity: 2,
          stockQuantity: 8,
          isAvailable: true,
          isStockSufficient: true,
          subtotalTtc: 99.8,
          imageUrl: "/img.webp",
        },
        {
          id: "line-invalid",
          productId: "prod-invalid",
          name: "Invalide",
          slug: "invalide",
          priceTtc: "49.9",
          quantity: 1,
          stockQuantity: 5,
          isAvailable: true,
          isStockSufficient: true,
          subtotalTtc: 49.9,
        },
      ],
    }

    const normalized = normalizeCartResponse(payload)

    expect(normalized.cartId).toBe("cart-1")
    expect(normalized.lines).toHaveLength(1)
    expect(normalized.totalItems).toBe(2)
    expect(normalized.totalTtc).toBe(99.8)
  })

  it("utilise les totaux du payload quand ils sont fournis", () => {
    const normalized = normalizeCartResponse({
      cartId: "cart-2",
      lines: [],
      totalItems: 7,
      totalTtc: 123.45,
    })

    expect(normalized.totalItems).toBe(7)
    expect(normalized.totalTtc).toBe(123.45)
  })

  it("extrait les infos d erreur mutation avec fallback null", () => {
    expect(
      extractCartLineErrorInfo({
        error: "Stock insuffisant",
        availableStock: 3,
      }),
    ).toEqual({
      message: "Stock insuffisant",
      availableStock: 3,
    })

    expect(extractCartLineErrorInfo({})).toEqual({
      message: null,
      availableStock: null,
    })

    expect(extractCartLineErrorInfo(null)).toEqual({
      message: null,
      availableStock: null,
    })
  })

  it("synchronise le badge panier dans le layout", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent")

    syncCartLayoutState(4, 87.6)

    expect(window.localStorage.getItem(CART_COUNT_STORAGE_KEY)).toBe("4")
    expect(window.localStorage.getItem("althea:cart_total")).toBe("87.6")
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event))
    expect((dispatchSpy.mock.calls[0]?.[0] as Event).type).toBe(
      CART_UPDATED_EVENT_NAME,
    )

    dispatchSpy.mockRestore()
  })
})
