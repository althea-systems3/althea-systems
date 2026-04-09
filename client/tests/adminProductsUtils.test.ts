import { describe, expect, it } from "vitest"

import {
  buildProductsCsvContent,
  buildTechnicalCharacteristicsPayload,
  calculateProductPriceHt,
  calculateProductPriceTtc,
  getProductAvailabilityLabel,
} from "../features/admin/products/adminProductsUtils"
import type { AdminProduct } from "../features/admin/products/adminProductsTypes"

describe("adminProductsUtils", () => {
  it("calculates TTC price from HT and VAT rate", () => {
    // Arrange
    const priceHt = 100

    // Act
    const computedPriceTtc = calculateProductPriceTtc(priceHt, "20")

    // Assert
    expect(computedPriceTtc).toBe(120)
  })

  it("calculates HT price from TTC and VAT rate", () => {
    // Arrange
    const priceTtc = 120

    // Act
    const computedPriceHt = calculateProductPriceHt(priceTtc, "20")

    // Assert
    expect(computedPriceHt).toBe(100)
  })

  it("builds null technical payload when attributes are empty", () => {
    // Arrange
    const technicalAttributes = [
      { id: "a", key: "", value: "" },
      { id: "b", key: " ", value: " " },
    ]

    // Act
    const technicalPayload =
      buildTechnicalCharacteristicsPayload(technicalAttributes)

    // Assert
    expect(technicalPayload).toBeNull()
  })

  it("builds a CSV content string with escaped values", () => {
    // Arrange
    const products: AdminProduct[] = [
      {
        id_produit: "p-1",
        nom: 'Routeur "Secure"',
        description: "Produit de test",
        caracteristique_tech: null,
        prix_ht: 100,
        tva: "20",
        prix_ttc: 120,
        quantite_stock: 12,
        statut: "publie" as const,
        slug: "routeur-secure",
        date_creation: "2026-04-09T10:00:00.000Z",
        image_principale_url: null,
        categories: [{ id_categorie: "c-1", nom: "Réseau" }],
      },
    ]

    // Act
    const csvContent = buildProductsCsvContent(products)

    // Assert
    expect(csvContent).toContain('"Routeur ""Secure"""')
    expect(csvContent).toContain('"Réseau"')
  })

  it("returns a stock availability label from stock quantity", () => {
    // Arrange
    const stockQuantity = 0

    // Act
    const stockLabel = getProductAvailabilityLabel(stockQuantity)

    // Assert
    expect(stockLabel).toBe("Rupture")
  })
})
