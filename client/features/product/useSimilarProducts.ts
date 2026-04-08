import { useEffect, useState } from "react"
import type { SimilarProduct, SimilarProductsApiResponse } from "./productTypes"

type UseSimilarProductsState = {
  similarProducts: SimilarProduct[]
  isSimilarProductsLoading: boolean
  hasSimilarProductsError: boolean
}

async function fetchSimilarProducts(
  slug: string,
  signal: AbortSignal,
): Promise<SimilarProductsApiResponse> {
  const response = await fetch(`/api/products/${slug}/similar`, {
    method: "GET",
    signal,
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to load similar products: ${response.status}`)
  }

  if (response.status === 404) {
    return { products: [] }
  }

  return (await response.json()) as SimilarProductsApiResponse
}

export function useSimilarProducts(slug: string): UseSimilarProductsState {
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [isSimilarProductsLoading, setIsSimilarProductsLoading] = useState(true)
  const [hasSimilarProductsError, setHasSimilarProductsError] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()

    const loadSimilarProducts = async () => {
      setIsSimilarProductsLoading(true)
      setHasSimilarProductsError(false)

      try {
        const response = await fetchSimilarProducts(
          slug,
          abortController.signal,
        )
        setSimilarProducts(response.products ?? [])
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error("Failed to load similar products", {
          slug,
          error,
        })
        setSimilarProducts([])
        setHasSimilarProductsError(true)
      } finally {
        if (!abortController.signal.aborted) {
          setIsSimilarProductsLoading(false)
        }
      }
    }

    loadSimilarProducts()

    return () => {
      abortController.abort()
    }
  }, [slug])

  return {
    similarProducts,
    isSimilarProductsLoading,
    hasSimilarProductsError,
  }
}
