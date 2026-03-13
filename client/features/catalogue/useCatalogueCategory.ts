import { useEffect, useState } from "react"
import type {
  CatalogueCategory,
  CatalogueCategoryApiResponse,
} from "./catalogueTypes"

type UseCatalogueCategoryState = {
  category: CatalogueCategory | null
  isCategoryLoading: boolean
  hasCategoryError: boolean
  isCategoryNotFound: boolean
}

async function fetchCatalogueCategory(
  slug: string,
  abortSignal: AbortSignal,
): Promise<CatalogueCategoryApiResponse> {
  const response = await fetch(`/api/catalogue/${slug}`, {
    method: "GET",
    signal: abortSignal,
  })

  if (response.status === 404) {
    return { category: null, notFound: true }
  }

  if (!response.ok) {
    throw new Error(`Failed to load category: ${response.status}`)
  }

  return (await response.json()) as CatalogueCategoryApiResponse
}

export function useCatalogueCategory(slug: string): UseCatalogueCategoryState {
  const [category, setCategory] = useState<CatalogueCategory | null>(null)
  const [isCategoryLoading, setIsCategoryLoading] = useState(true)
  const [hasCategoryError, setHasCategoryError] = useState(false)
  const [isCategoryNotFound, setIsCategoryNotFound] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()

    const loadCategory = async () => {
      setIsCategoryLoading(true)
      setHasCategoryError(false)
      setIsCategoryNotFound(false)

      try {
        const result = await fetchCatalogueCategory(
          slug,
          abortController.signal,
        )

        if (result.notFound) {
          setIsCategoryNotFound(true)
          setCategory(null)
        } else {
          setCategory(result.category)
        }
      } catch (error) {
        if (abortController.signal.aborted) return

        console.error("Failed to load catalogue category", { slug, error })
        setHasCategoryError(true)
      } finally {
        if (!abortController.signal.aborted) {
          setIsCategoryLoading(false)
        }
      }
    }

    loadCategory()

    return () => {
      abortController.abort()
    }
  }, [slug])

  return {
    category,
    isCategoryLoading,
    hasCategoryError,
    isCategoryNotFound,
  }
}
