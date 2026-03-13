export type CatalogueCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
}

export type CatalogueCategoryApiResponse = {
  category: CatalogueCategory | null
  notFound?: boolean
}

export type CatalogueProduct = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  price: number | null
  isAvailable: boolean
}

export type CatalogueProductsPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type CatalogueProductsApiResponse = {
  products: CatalogueProduct[]
  pagination: CatalogueProductsPagination
  notFound?: boolean
}
