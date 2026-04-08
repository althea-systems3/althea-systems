import { useEffect, useState } from "react"
import type { ProductDetail, ProductDetailApiResponse } from "./productTypes"

type UseProductDetailState = {
  product: ProductDetail | null
  isProductLoading: boolean
  hasProductError: boolean
  isProductNotFound: boolean
}

async function fetchProductDetail(
  slug: string,
  signal: AbortSignal,
): Promise<ProductDetailApiResponse> {
  const response = await fetch(`/api/products/${slug}`, {
    method: "GET",
    signal,
  })

  if (response.status === 404) {
    return { product: null, notFound: true }
  }

  if (!response.ok) {
    throw new Error(`Failed to load product detail: ${response.status}`)
  }

  return (await response.json()) as ProductDetailApiResponse
}

export function useProductDetail(slug: string): UseProductDetailState {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [isProductLoading, setIsProductLoading] = useState(true)
  const [hasProductError, setHasProductError] = useState(false)
  const [isProductNotFound, setIsProductNotFound] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()

    const loadProduct = async () => {
      setIsProductLoading(true)
      setHasProductError(false)
      setIsProductNotFound(false)

      try {
        const response = await fetchProductDetail(slug, abortController.signal)

        if (response.notFound || !response.product) {
          setProduct(null)
          setIsProductNotFound(true)
          return
        }

        setProduct(response.product)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error("Failed to load product detail", {
          slug,
          error,
        })
        setProduct(null)
        setHasProductError(true)
      } finally {
        if (!abortController.signal.aborted) {
          setIsProductLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      abortController.abort()
    }
  }, [slug])

  return {
    product,
    isProductLoading,
    hasProductError,
    isProductNotFound,
  }
}
