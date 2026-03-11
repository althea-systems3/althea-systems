import { describe, expect, it } from "vitest"
import {
  formatTopProductPrice,
  getHasNoHomeTopProducts,
  getTopProductPagePath,
} from "../features/home/topProducts/topProductsUtils"

describe("topProductsUtils", () => {
  it("builds the product page path from the product slug", () => {
    // Arrange
    const productSlug = "switch-industriel-redondant"

    // Act
    const productPath = getTopProductPagePath(productSlug)

    // Assert
    expect(productPath).toBe("/catalogue/switch-industriel-redondant")
  })

  it("returns true when there is no product to display", () => {
    // Arrange
    const isHomeTopProductsGridLoading = false
    const hasHomeTopProductsGridError = false
    const homeTopProductCount = 0

    // Act
    const hasNoHomeTopProducts = getHasNoHomeTopProducts(
      isHomeTopProductsGridLoading,
      hasHomeTopProductsGridError,
      homeTopProductCount,
    )

    // Assert
    expect(hasNoHomeTopProducts).toBe(true)
  })

  it("formats a top product price with euro currency", () => {
    // Arrange
    const productPrice = 649

    // Act
    const formattedPrice = formatTopProductPrice(productPrice, "fr")

    // Assert
    expect(formattedPrice).toContain("649")
    expect(formattedPrice).toContain("€")
  })
})
