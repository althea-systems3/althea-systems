export type AdminCategoryStatus = "active" | "inactive"

export type AdminCategorySortBy = "nom" | "nombre_produits" | "ordre_affiche"

export type AdminCategorySortDirection = "asc" | "desc"

export type AdminCategoryStatusFilter = "all" | AdminCategoryStatus

export type AdminCategory = {
  id_categorie: string
  nom: string
  description: string | null
  slug: string
  ordre_affiche: number
  statut: AdminCategoryStatus
  image_url: string | null
  nombre_produits: number
}

export type AdminCategoryAssociatedProduct = {
  id_produit: string
  nom: string
  slug: string
  statut: "publie" | "brouillon"
  quantite_stock: number
  image_principale_url: string | null
}

export type AdminCategoryDetailPayload = {
  category: AdminCategory
  products: AdminCategoryAssociatedProduct[]
}

export type AdminCategoriesFilters = {
  search: string
  status: AdminCategoryStatusFilter
  sortBy: AdminCategorySortBy
  sortDirection: AdminCategorySortDirection
}

export type AdminCategoryWritePayload = {
  nom: string
  description: string | null
  slug: string
  statut: AdminCategoryStatus
  image_url: string | null
}

export type AdminCategoriesBulkAction = "activate" | "deactivate"
