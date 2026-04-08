import { describe, expect, it } from "vitest"
import { SEARCH_DEFAULT_FILTERS } from "@/features/search/searchConstants"
import {
  buildSearchParamsFromFilters,
  hasActiveSearchCriteria,
  parseSearchFilters,
} from "@/features/search/searchUtils"

describe("searchUtils", () => {
  it("parse les filtres avances depuis l URL", () => {
    const searchParams = new URLSearchParams(
      "q=audio&title=Interface&description=studio&characteristics=USB-C&price_min=100&price_max=900&categories=cat-1,cat-2&available_only=true&sort_by=price&sort_order=asc&page=3",
    )

    const parsedFilters = parseSearchFilters(searchParams)

    expect(parsedFilters.q).toBe("audio")
    expect(parsedFilters.title).toBe("Interface")
    expect(parsedFilters.description).toBe("studio")
    expect(parsedFilters.characteristics).toBe("USB-C")
    expect(parsedFilters.priceMin).toBe("100")
    expect(parsedFilters.priceMax).toBe("900")
    expect(parsedFilters.categories).toEqual(["cat-1", "cat-2"])
    expect(parsedFilters.availableOnly).toBe(true)
    expect(parsedFilters.sortBy).toBe("price")
    expect(parsedFilters.sortOrder).toBe("asc")
    expect(parsedFilters.page).toBe(3)
  })

  it("reste retrocompatible avec les anciens paramètres de tri", () => {
    const searchParams = new URLSearchParams("sort=price_desc")

    const parsedFilters = parseSearchFilters(searchParams)

    expect(parsedFilters.sortBy).toBe("price")
    expect(parsedFilters.sortOrder).toBe("desc")
  })

  it("serialize correctement les filtres vers l URL", () => {
    const searchParams = buildSearchParamsFromFilters({
      ...SEARCH_DEFAULT_FILTERS,
      q: "automate",
      title: "AP-200",
      categories: ["cat-a"],
      availableOnly: true,
      sortBy: "availability",
      sortOrder: "desc",
      page: 2,
    })

    expect(searchParams.get("q")).toBe("automate")
    expect(searchParams.get("title")).toBe("AP-200")
    expect(searchParams.get("categories")).toBe("cat-a")
    expect(searchParams.get("available_only")).toBe("true")
    expect(searchParams.get("sort_by")).toBe("availability")
    expect(searchParams.get("sort_order")).toBe("desc")
    expect(searchParams.get("page")).toBe("2")
  })

  it("detecte l absence de criteres actifs", () => {
    expect(hasActiveSearchCriteria(SEARCH_DEFAULT_FILTERS)).toBe(false)

    expect(
      hasActiveSearchCriteria({
        ...SEARCH_DEFAULT_FILTERS,
        characteristics: "ip67",
      }),
    ).toBe(true)
  })
})
