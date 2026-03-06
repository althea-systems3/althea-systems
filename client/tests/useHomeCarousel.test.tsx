import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useHomeCarousel } from "../features/home/carousel/useHomeCarousel"

function createCarouselResponse() {
  return {
    slides: [
      {
        id: "slide-1",
        imageUrl: "/carousel/pro-audio.svg",
        imageAlt: "Slide one alt text",
        title: "Slide one title",
        description: "Slide one description",
        ctaLabel: "Go one",
        redirectUrl: "/contact",
      },
      {
        id: "slide-2",
        imageUrl: "/carousel/industrial-network.svg",
        imageAlt: "Slide two alt text",
        title: "Slide two title",
        description: "Slide two description",
        ctaLabel: "Go two",
        redirectUrl: "/cgu",
      },
    ],
  }
}

describe("useHomeCarousel", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("loads slides from the API and exposes loading state", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => createCarouselResponse(),
    } as Response)

    // Act
    const { result } = renderHook(() => useHomeCarousel())

    // Assert
    expect(result.current.isCarouselLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isCarouselLoading).toBe(false)
      expect(result.current.carouselSlides).toHaveLength(2)
    })
  })

  it("moves to next and previous slides through handlers", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => createCarouselResponse(),
    } as Response)

    const { result } = renderHook(() => useHomeCarousel())

    await waitFor(() => {
      expect(result.current.carouselSlides).toHaveLength(2)
    })

    // Act
    act(() => {
      result.current.handleGoToNextSlide()
    })

    // Assert
    expect(result.current.activeSlideIndex).toBe(1)

    // Act
    act(() => {
      result.current.handleGoToPreviousSlide()
    })

    // Assert
    expect(result.current.activeSlideIndex).toBe(0)
  })

  it("supports swipe navigation on mobile gestures", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => createCarouselResponse(),
    } as Response)

    const { result } = renderHook(() => useHomeCarousel())

    await waitFor(() => {
      expect(result.current.carouselSlides).toHaveLength(2)
    })

    // Act
    act(() => {
      result.current.handleStartSwipe(200)
      result.current.handleEndSwipe(120)
    })

    // Assert
    expect(result.current.activeSlideIndex).toBe(1)
  })

  it("falls back to an empty list when API request fails", async () => {
    // Arrange
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"))

    // Act
    const { result } = renderHook(() => useHomeCarousel())

    // Assert
    await waitFor(() => {
      expect(result.current.isCarouselLoading).toBe(false)
      expect(result.current.carouselSlides).toHaveLength(0)
    })
  })
})
