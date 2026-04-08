import { useEffect, useState } from "react"
import type {
  SearchFacetCategory,
  SearchFacetsApiResponse,
  SearchPriceRange,
} from "./searchTypes"

type UseSearchFacetsState = {
  categories: SearchFacetCategory[]
  priceRange: SearchPriceRange | null
  isSearchFacetsLoading: boolean
  hasSearchFacetsError: boolean
}

async function fetchSearchFacets(
  abortSignal: AbortSignal,
): Promise<SearchFacetsApiResponse> {
  const response = await fetch("/api/search/facets", {
    method: "GET",
    signal: abortSignal,
  })

  if (!response.ok) {
    throw new Error(`Failed to load search facets: ${response.status}`)
  }

  const payload = (await response.json()) as SearchFacetsApiResponse

  return {
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    priceRange: payload.priceRange ?? null,
  }
}

export function useSearchFacets(): UseSearchFacetsState {
  const [categories, setCategories] = useState<SearchFacetCategory[]>([])
  const [priceRange, setPriceRange] = useState<SearchPriceRange | null>(null)
  const [isSearchFacetsLoading, setIsSearchFacetsLoading] = useState(true)
  const [hasSearchFacetsError, setHasSearchFacetsError] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()

    const loadSearchFacets = async () => {
      setIsSearchFacetsLoading(true)
      setHasSearchFacetsError(false)

      try {
        const response = await fetchSearchFacets(abortController.signal)
        setCategories(response.categories)
        setPriceRange(response.priceRange)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error("Failed to load search facets", { error })
        setCategories([])
        setPriceRange(null)
        setHasSearchFacetsError(true)
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearchFacetsLoading(false)
        }
      }
    }

    loadSearchFacets()

    return () => {
      abortController.abort()
    }
  }, [])

  return {
    categories,
    priceRange,
    isSearchFacetsLoading,
    hasSearchFacetsError,
  }
}
