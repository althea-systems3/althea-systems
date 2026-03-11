import { useEffect, useState } from "react"
import type {
  HomeTopProduct,
  HomeTopProductsApiResponse,
} from "./topProductsTypes"

type UseHomeTopProductsGridState = {
  homeTopProducts: HomeTopProduct[]
  isHomeTopProductsGridLoading: boolean
  hasHomeTopProductsGridError: boolean
  isUsingFallbackHomeTopProducts: boolean
}

async function fetchHomeTopProducts(
  abortSignal: AbortSignal,
): Promise<HomeTopProductsApiResponse> {
  const response = await fetch("/api/top-products", {
    method: "GET",
    signal: abortSignal,
  })

  if (!response.ok) {
    throw new Error("Unable to load home top products")
  }

  const payload = (await response.json()) as HomeTopProductsApiResponse

  return {
    products: Array.isArray(payload.products) ? payload.products : [],
    isFallbackData: payload.isFallbackData === true,
  }
}

export function useHomeTopProductsGrid(): UseHomeTopProductsGridState {
  const [homeTopProducts, setHomeTopProducts] = useState<HomeTopProduct[]>([])
  const [isHomeTopProductsGridLoading, setIsHomeTopProductsGridLoading] =
    useState(true)
  const [hasHomeTopProductsGridError, setHasHomeTopProductsGridError] =
    useState(false)
  const [isUsingFallbackHomeTopProducts, setIsUsingFallbackHomeTopProducts] =
    useState(false)

  useEffect(() => {
    const abortController = new AbortController()

    const loadHomeTopProducts = async () => {
      setIsHomeTopProductsGridLoading(true)
      setHasHomeTopProductsGridError(false)
      setIsUsingFallbackHomeTopProducts(false)

      try {
        const loadedHomeTopProductsResponse = await fetchHomeTopProducts(
          abortController.signal,
        )
        setHomeTopProducts(loadedHomeTopProductsResponse.products)
        setIsUsingFallbackHomeTopProducts(
          loadedHomeTopProductsResponse.isFallbackData === true,
        )
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error("Failed to load top products from /api/top-products", {
          error,
        })
        setHomeTopProducts([])
        setHasHomeTopProductsGridError(true)
        setIsUsingFallbackHomeTopProducts(false)
      } finally {
        if (!abortController.signal.aborted) {
          setIsHomeTopProductsGridLoading(false)
        }
      }
    }

    loadHomeTopProducts()

    return () => {
      abortController.abort()
    }
  }, [])

  return {
    homeTopProducts,
    isHomeTopProductsGridLoading,
    hasHomeTopProductsGridError,
    isUsingFallbackHomeTopProducts,
  }
}
