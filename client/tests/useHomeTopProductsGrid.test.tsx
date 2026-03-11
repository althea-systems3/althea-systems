import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useHomeTopProductsGrid } from "../features/home/topProducts/useHomeTopProductsGrid"

function createHomeTopProductsResponse() {
  return {
    isFallbackData: false,
    products: [
      {
        id: "top-product-1",
        name: "Interface Audio DSP-24",
        slug: "interface-audio-dsp-24",
        imageUrl: "https://cdn.example.com/interface-audio.webp",
        price: 649,
        displayOrder: 1,
        isAvailable: true,
      },
      {
        id: "top-product-2",
        name: "Switch Industriel Redondant",
        slug: "switch-industriel-redondant",
        imageUrl: null,
        price: null,
        displayOrder: 2,
        isAvailable: false,
      },
    ],
  }
}

describe("useHomeTopProductsGrid", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("loads top products from the API and exposes loading state", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => createHomeTopProductsResponse(),
    } as Response)

    // Act
    const { result } = renderHook(() => useHomeTopProductsGrid())

    // Assert
    expect(result.current.isHomeTopProductsGridLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isHomeTopProductsGridLoading).toBe(false)
      expect(result.current.hasHomeTopProductsGridError).toBe(false)
      expect(result.current.isUsingFallbackHomeTopProducts).toBe(false)
      expect(result.current.homeTopProducts).toHaveLength(2)
    })
  })

  it("returns an empty array when API responds without products", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ products: [], isFallbackData: false }),
    } as Response)

    // Act
    const { result } = renderHook(() => useHomeTopProductsGrid())

    // Assert
    await waitFor(() => {
      expect(result.current.isHomeTopProductsGridLoading).toBe(false)
      expect(result.current.hasHomeTopProductsGridError).toBe(false)
      expect(result.current.isUsingFallbackHomeTopProducts).toBe(false)
      expect(result.current.homeTopProducts).toHaveLength(0)
    })
  })

  it("exposes fallback-data state when API returns temporary products", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        products: createHomeTopProductsResponse().products,
        isFallbackData: true,
      }),
    } as Response)

    // Act
    const { result } = renderHook(() => useHomeTopProductsGrid())

    // Assert
    await waitFor(() => {
      expect(result.current.isHomeTopProductsGridLoading).toBe(false)
      expect(result.current.hasHomeTopProductsGridError).toBe(false)
      expect(result.current.isUsingFallbackHomeTopProducts).toBe(true)
      expect(result.current.homeTopProducts).toHaveLength(2)
    })
  })

  it("reports an error state when API request fails", async () => {
    // Arrange
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"))

    // Act
    const { result } = renderHook(() => useHomeTopProductsGrid())

    // Assert
    await waitFor(() => {
      expect(result.current.isHomeTopProductsGridLoading).toBe(false)
      expect(result.current.hasHomeTopProductsGridError).toBe(true)
      expect(result.current.isUsingFallbackHomeTopProducts).toBe(false)
      expect(result.current.homeTopProducts).toHaveLength(0)
    })
  })
})
