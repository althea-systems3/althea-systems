import { useEffect, useState } from "react"
import type {
  HomeCategoriesApiResponse,
  HomeCategory,
} from "./categoryGridTypes"

type UseHomeCategoryGridState = {
  homeCategories: HomeCategory[]
  isHomeCategoryGridLoading: boolean
  hasHomeCategoryGridError: boolean
  isUsingFallbackHomeCategories: boolean
}

async function fetchHomeCategories(
  abortSignal: AbortSignal,
): Promise<HomeCategoriesApiResponse> {
  const response = await fetch("/api/categories", {
    method: "GET",
    signal: abortSignal,
  })

  if (!response.ok) {
    throw new Error("Unable to load home categories")
  }

  const payload = (await response.json()) as HomeCategoriesApiResponse

  return {
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    isFallbackData: payload.isFallbackData === true,
  }
}

export function useHomeCategoryGrid(): UseHomeCategoryGridState {
  const [homeCategories, setHomeCategories] = useState<HomeCategory[]>([])
  const [isHomeCategoryGridLoading, setIsHomeCategoryGridLoading] =
    useState(true)
  const [hasHomeCategoryGridError, setHasHomeCategoryGridError] =
    useState(false)
  const [isUsingFallbackHomeCategories, setIsUsingFallbackHomeCategories] =
    useState(false)

  useEffect(() => {
    const abortController = new AbortController()

    const loadHomeCategories = async () => {
      setIsHomeCategoryGridLoading(true)
      setHasHomeCategoryGridError(false)
      setIsUsingFallbackHomeCategories(false)

      try {
        const loadedHomeCategoryResponse = await fetchHomeCategories(
          abortController.signal,
        )
        setHomeCategories(loadedHomeCategoryResponse.categories)
        setIsUsingFallbackHomeCategories(
          loadedHomeCategoryResponse.isFallbackData === true,
        )
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error("Failed to load categories from /api/categories", {
          error,
        })
        setHomeCategories([])
        setHasHomeCategoryGridError(true)
        setIsUsingFallbackHomeCategories(false)
      } finally {
        if (!abortController.signal.aborted) {
          setIsHomeCategoryGridLoading(false)
        }
      }
    }

    loadHomeCategories()

    return () => {
      abortController.abort()
    }
  }, [])

  return {
    homeCategories,
    isHomeCategoryGridLoading,
    hasHomeCategoryGridError,
    isUsingFallbackHomeCategories,
  }
}
