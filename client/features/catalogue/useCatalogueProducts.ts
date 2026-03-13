import { useCallback, useEffect, useState } from "react"
import type {
  CatalogueProduct,
  CatalogueProductsApiResponse,
  CatalogueProductsPagination,
} from "./catalogueTypes"
import { CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE } from "./catalogueConstants"

type UseCatalogueProductsState = {
  products: CatalogueProduct[]
  isProductsLoading: boolean
  hasProductsError: boolean
  pagination: CatalogueProductsPagination
  goToPage: (page: number) => void
}

async function fetchCatalogueProducts(
  slug: string,
  page: number,
  abortSignal: AbortSignal,
): Promise<CatalogueProductsApiResponse> {
  const url = new URL(`/api/catalogue/${slug}/products`, window.location.origin)
  url.searchParams.set("page", String(page))
  url.searchParams.set("pageSize", String(CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE))

  const response = await fetch(url.toString(), {
    method: "GET",
    signal: abortSignal,
  })

  if (!response.ok) {
    throw new Error(`Failed to load catalogue products: ${response.status}`)
  }

  return (await response.json()) as CatalogueProductsApiResponse
}

export function useCatalogueProducts(slug: string): UseCatalogueProductsState {
  const [products, setProducts] = useState<CatalogueProduct[]>([])
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const [hasProductsError, setHasProductsError] = useState(false)
  const [pagination, setPagination] = useState<CatalogueProductsPagination>({
    page: 1,
    pageSize: CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const abortController = new AbortController()

    const loadProducts = async () => {
      setIsProductsLoading(true)
      setHasProductsError(false)

      try {
        const result = await fetchCatalogueProducts(
          slug,
          currentPage,
          abortController.signal,
        )

        setProducts(result.products)
        setPagination(result.pagination)
      } catch (error) {
        if (abortController.signal.aborted) return

        console.error("Failed to load catalogue products", {
          slug,
          page: currentPage,
          error,
        })
        setProducts([])
        setHasProductsError(true)
      } finally {
        if (!abortController.signal.aborted) {
          setIsProductsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      abortController.abort()
    }
  }, [slug, currentPage])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return {
    products,
    isProductsLoading,
    hasProductsError,
    pagination,
    goToPage,
  }
}
