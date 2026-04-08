export type SearchSortBy = "price" | "newness" | "availability"
export type SearchSortOrder = "asc" | "desc"

export type AdvancedSearchFilters = {
  q: string
  title: string
  description: string
  characteristics: string
  priceMin: string
  priceMax: string
  categories: string[]
  availableOnly: boolean
  sortBy: SearchSortBy
  sortOrder: SearchSortOrder
  page: number
}

export type SearchResultProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  priceTtc: number | null
  isAvailable: boolean
  imageUrl: string | null
  relevanceScore: number
}

export type SearchPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type SearchApiResponse = {
  products: SearchResultProduct[]
  pagination: SearchPagination | null
  isPartialData?: boolean
}

export type SearchFacetCategory = {
  id: string
  name: string
  slug: string
}

export type SearchPriceRange = {
  min: number
  max: number
}

export type SearchFacetsApiResponse = {
  categories: SearchFacetCategory[]
  priceRange: SearchPriceRange | null
}
