export type AdminProductStatus = "publie" | "brouillon"
export type AdminProductTva = "20" | "10" | "5.5" | "0"

export type AdminProductSortBy =
  | "nom"
  | "prix_ht"
  | "prix_ttc"
  | "quantite_stock"
  | "statut"
  | "date_creation"

export type AdminProductSortDirection = "asc" | "desc"

export type AdminProductAvailabilityFilter = "all" | "in_stock" | "out_of_stock"

export type AdminCategory = {
  id_categorie: string
  nom: string
}

export type AdminProductImage = {
  url: string
  ordre: number
  est_principale: boolean
  alt_text?: string | null
}

export type AdminProduct = {
  id_produit: string
  nom: string
  description: string | null
  caracteristique_tech: Record<string, unknown> | null
  prix_ht: number
  tva: AdminProductTva
  prix_ttc: number
  quantite_stock: number
  statut: AdminProductStatus
  slug: string
  date_creation: string | null
  image_principale_url: string | null
  categories: AdminCategory[]
  images?: AdminProductImage[]
}

export type AdminProductListFilters = {
  search: string
  status: "all" | AdminProductStatus
  categoryId: string
  availability: AdminProductAvailabilityFilter
  createdFrom: string
  createdTo: string
  priceMin: string
  priceMax: string
  sortBy: AdminProductSortBy
  sortDirection: AdminProductSortDirection
  page: number
  pageSize: number
}

export type AdminProductsListResponse = {
  products: AdminProduct[]
  categories: AdminCategory[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type AdminProductDetailResponse = {
  product: AdminProduct
}

export type AdminBulkAction =
  | "delete"
  | "publish"
  | "unpublish"
  | "set_category"

export type AdminBulkActionResponse = {
  success: boolean
  action: AdminBulkAction
  affectedCount: number
}

export type AdminProductFormTechnicalAttribute = {
  id: string
  key: string
  value: string
}

export type AdminProductFormValues = {
  nom: string
  description: string
  categoryIds: string[]
  prixHt: string
  tva: AdminProductTva
  prixTtc: string
  quantiteStock: string
  statut: AdminProductStatus
  slug: string
  technicalAttributes: AdminProductFormTechnicalAttribute[]
}
