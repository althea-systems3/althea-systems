import { useEffect, useRef, useState } from "react"

import { SEARCH_TEXT_DEBOUNCE_MS } from "./searchConstants"
import type { SearchApiResponse, SearchResultProduct } from "./searchTypes"

const SUGGESTION_LIMIT = 6
const MIN_QUERY_LENGTH = 2

type UseSearchSuggestionsState = {
  suggestions: SearchResultProduct[]
  isSuggestionsLoading: boolean
  hasSuggestionsError: boolean
}

export function useSearchSuggestions(
  rawQuery: string,
  isEnabled: boolean,
): UseSearchSuggestionsState {
  const [internalSuggestions, setInternalSuggestions] = useState<
    SearchResultProduct[]
  >([])
  const [internalIsLoading, setInternalIsLoading] = useState(false)
  const [internalHasError, setInternalHasError] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  const trimmedQuery = rawQuery.trim()
  const shouldFetch = isEnabled && trimmedQuery.length >= MIN_QUERY_LENGTH

  useEffect(() => {
    if (!shouldFetch) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      return
    }

    const debounceTimeoutId = window.setTimeout(() => {
      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setInternalIsLoading(true)
      setInternalHasError(false)

      const requestUrl = `/api/search?q=${encodeURIComponent(trimmedQuery)}&limit=${SUGGESTION_LIMIT}&sort_by=relevance&sort_order=desc`

      fetch(requestUrl, { method: "GET", signal: abortController.signal })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Search suggestions failed: ${response.status}`)
          }
          return (await response.json()) as SearchApiResponse
        })
        .then((data) => {
          setInternalSuggestions(data.products ?? [])
          setInternalIsLoading(false)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return
          }
          setInternalSuggestions([])
          setInternalIsLoading(false)
          setInternalHasError(true)
        })
    }, SEARCH_TEXT_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(debounceTimeoutId)
    }
  }, [shouldFetch, trimmedQuery])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  if (!shouldFetch) {
    return {
      suggestions: [],
      isSuggestionsLoading: false,
      hasSuggestionsError: false,
    }
  }

  return {
    suggestions: internalSuggestions,
    isSuggestionsLoading: internalIsLoading,
    hasSuggestionsError: internalHasError,
  }
}
