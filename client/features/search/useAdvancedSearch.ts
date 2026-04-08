import { useEffect, useMemo, useRef, useState } from "react"
import { buildSearchApiRequestUrl } from "./searchUtils"
import type {
  AdvancedSearchFilters,
  SearchApiResponse,
  SearchPagination,
  SearchResultProduct,
} from "./searchTypes"

type UseAdvancedSearchState = {
  products: SearchResultProduct[]
  pagination: SearchPagination | null
  isSearchLoading: boolean
  isSearchRefreshing: boolean
  hasSearchError: boolean
  isPartialData: boolean
}

async function fetchAdvancedSearchResults(
  requestUrl: string,
  abortSignal: AbortSignal,
): Promise<SearchApiResponse> {
  const response = await fetch(requestUrl, {
    method: "GET",
    signal: abortSignal,
  })

  if (!response.ok) {
    throw new Error(
      `Failed to load advanced search results: ${response.status}`,
    )
  }

  return (await response.json()) as SearchApiResponse
}

export function useAdvancedSearch(
  filters: AdvancedSearchFilters,
  isSearchEnabled: boolean,
): UseAdvancedSearchState {
  const [products, setProducts] = useState<SearchResultProduct[]>([])
  const [pagination, setPagination] = useState<SearchPagination | null>(null)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [isSearchRefreshing, setIsSearchRefreshing] = useState(false)
  const [hasSearchError, setHasSearchError] = useState(false)
  const [isPartialData, setIsPartialData] = useState(false)

  const hasLoadedSearchAtLeastOnceRef = useRef(false)

  const requestUrl = useMemo(() => {
    return buildSearchApiRequestUrl(filters)
  }, [filters])

  useEffect(() => {
    if (!isSearchEnabled) {
      setProducts([])
      setPagination(null)
      setHasSearchError(false)
      setIsSearchLoading(false)
      setIsSearchRefreshing(false)
      setIsPartialData(false)
      hasLoadedSearchAtLeastOnceRef.current = false
      return
    }

    const abortController = new AbortController()

    const loadAdvancedSearch = async () => {
      setHasSearchError(false)

      if (hasLoadedSearchAtLeastOnceRef.current) {
        setIsSearchRefreshing(true)
      } else {
        setIsSearchLoading(true)
      }

      try {
        const response = await fetchAdvancedSearchResults(
          requestUrl,
          abortController.signal,
        )

        setProducts(Array.isArray(response.products) ? response.products : [])
        setPagination(response.pagination ?? null)
        setIsPartialData(response.isPartialData === true)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error("Failed to load advanced search results", {
          requestUrl,
          error,
        })
        setHasSearchError(true)
        setIsPartialData(false)
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearchLoading(false)
          setIsSearchRefreshing(false)
          hasLoadedSearchAtLeastOnceRef.current = true
        }
      }
    }

    loadAdvancedSearch()

    return () => {
      abortController.abort()
    }
  }, [isSearchEnabled, requestUrl])

  return {
    products,
    pagination,
    isSearchLoading,
    isSearchRefreshing,
    hasSearchError,
    isPartialData,
  }
}
