import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useHomeCategoryGrid } from "../features/home/categories/useHomeCategoryGrid"

function createHomeCategoriesResponse() {
  return {
    isFallbackData: false,
    categories: [
      {
        id: "category-audio",
        name: "Audio Pro",
        slug: "audio-pro",
        imageUrl: "https://cdn.example.com/audio-pro.webp",
      },
      {
        id: "category-network",
        name: "Reseau Industriel",
        slug: "reseau-industriel",
        imageUrl: null,
      },
    ],
  }
}

describe("useHomeCategoryGrid", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("loads active categories from the API and exposes loading state", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => createHomeCategoriesResponse(),
    } as Response)

    // Act
    const { result } = renderHook(() => useHomeCategoryGrid())

    // Assert
    expect(result.current.isHomeCategoryGridLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isHomeCategoryGridLoading).toBe(false)
      expect(result.current.hasHomeCategoryGridError).toBe(false)
      expect(result.current.isUsingFallbackHomeCategories).toBe(false)
      expect(result.current.homeCategories).toHaveLength(2)
    })
  })

  it("returns an empty array when API responds without categories", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ categories: [], isFallbackData: false }),
    } as Response)

    // Act
    const { result } = renderHook(() => useHomeCategoryGrid())

    // Assert
    await waitFor(() => {
      expect(result.current.isHomeCategoryGridLoading).toBe(false)
      expect(result.current.hasHomeCategoryGridError).toBe(false)
      expect(result.current.isUsingFallbackHomeCategories).toBe(false)
      expect(result.current.homeCategories).toHaveLength(0)
    })
  })

  it("exposes fallback-data state when API returns temporary categories", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: createHomeCategoriesResponse().categories,
        isFallbackData: true,
      }),
    } as Response)

    // Act
    const { result } = renderHook(() => useHomeCategoryGrid())

    // Assert
    await waitFor(() => {
      expect(result.current.isHomeCategoryGridLoading).toBe(false)
      expect(result.current.hasHomeCategoryGridError).toBe(false)
      expect(result.current.isUsingFallbackHomeCategories).toBe(true)
      expect(result.current.homeCategories).toHaveLength(2)
    })
  })

  it("reports an error state when API request fails", async () => {
    // Arrange
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"))

    // Act
    const { result } = renderHook(() => useHomeCategoryGrid())

    // Assert
    await waitFor(() => {
      expect(result.current.isHomeCategoryGridLoading).toBe(false)
      expect(result.current.hasHomeCategoryGridError).toBe(true)
      expect(result.current.isUsingFallbackHomeCategories).toBe(false)
      expect(result.current.homeCategories).toHaveLength(0)
    })
  })
})
