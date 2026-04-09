import { slugify } from "@/lib/admin/common"

import type {
  AdminCategory,
  AdminCategoriesFilters,
  AdminCategorySortBy,
  AdminCategorySortDirection,
  AdminCategoryStatus,
} from "./adminCategoriesTypes"

export const ADMIN_CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const ADMIN_CATEGORY_SORT_LABELS: Record<AdminCategorySortBy, string> = {
  nom: "Nom",
  nombre_produits: "Nombre de produits",
  ordre_affiche: "Ordre d'affichage",
}

export const DEFAULT_ADMIN_CATEGORIES_FILTERS: AdminCategoriesFilters = {
  search: "",
  status: "all",
  sortBy: "ordre_affiche",
  sortDirection: "asc",
}

export function createDefaultAdminCategoriesFilters(): AdminCategoriesFilters {
  return {
    ...DEFAULT_ADMIN_CATEGORIES_FILTERS,
  }
}

export function parseAdminCategoriesFiltersFromSearchParams(
  searchParams: URLSearchParams,
): AdminCategoriesFilters {
  const statusValue = searchParams.get("status")
  const sortByValue = searchParams.get("sortBy")
  const sortDirectionValue = searchParams.get("sortDirection")

  return {
    search: (searchParams.get("search") ?? "").trim(),
    status:
      statusValue === "active" || statusValue === "inactive"
        ? statusValue
        : "all",
    sortBy:
      sortByValue === "nom" ||
      sortByValue === "nombre_produits" ||
      sortByValue === "ordre_affiche"
        ? sortByValue
        : "ordre_affiche",
    sortDirection: sortDirectionValue === "desc" ? "desc" : "asc",
  }
}

export function buildAdminCategoriesQueryString(
  filters: AdminCategoriesFilters,
): string {
  const searchParams = new URLSearchParams()

  if (filters.search.trim()) {
    searchParams.set("search", filters.search.trim())
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status)
  }

  searchParams.set("sortBy", filters.sortBy)
  searchParams.set("sortDirection", filters.sortDirection)

  return searchParams.toString()
}

export function mapCategoryStatusLabel(status: AdminCategoryStatus): string {
  return status === "active" ? "Active" : "Inactive"
}

export function mapCategoryStatusClassName(
  status: AdminCategoryStatus,
): string {
  return status === "active"
    ? "bg-brand-success text-white"
    : "bg-brand-alert text-white"
}

export function mapCategoryStatusUi(status: AdminCategoryStatus): {
  label: string
  className: string
} {
  return {
    label: mapCategoryStatusLabel(status),
    className: mapCategoryStatusClassName(status),
  }
}

export function getNextSortDirection(
  currentSortBy: AdminCategorySortBy,
  currentSortDirection: AdminCategorySortDirection,
  nextSortBy: AdminCategorySortBy,
): AdminCategorySortDirection {
  if (currentSortBy !== nextSortBy) {
    return "asc"
  }

  return currentSortDirection === "asc" ? "desc" : "asc"
}

export function moveCategoryByOffset(
  categories: AdminCategory[],
  categoryId: string,
  offset: number,
): AdminCategory[] {
  const currentIndex = categories.findIndex(
    (category) => category.id_categorie === categoryId,
  )

  if (currentIndex < 0) {
    return categories
  }

  const targetIndex = currentIndex + offset

  if (targetIndex < 0 || targetIndex >= categories.length) {
    return categories
  }

  const nextCategories = [...categories]
  const [movedCategory] = nextCategories.splice(currentIndex, 1)
  nextCategories.splice(targetIndex, 0, movedCategory)

  return nextCategories.map((category, index) => ({
    ...category,
    ordre_affiche: index + 1,
  }))
}

export function reorderCategoriesByDragAndDrop(
  categories: AdminCategory[],
  sourceCategoryId: string,
  targetCategoryId: string,
): AdminCategory[] {
  if (sourceCategoryId === targetCategoryId) {
    return categories
  }

  const sourceIndex = categories.findIndex(
    (category) => category.id_categorie === sourceCategoryId,
  )
  const targetIndex = categories.findIndex(
    (category) => category.id_categorie === targetCategoryId,
  )

  if (sourceIndex < 0 || targetIndex < 0) {
    return categories
  }

  const nextCategories = [...categories]
  const [movedCategory] = nextCategories.splice(sourceIndex, 1)
  nextCategories.splice(targetIndex, 0, movedCategory)

  return nextCategories.map((category, index) => ({
    ...category,
    ordre_affiche: index + 1,
  }))
}

export function generateCategorySlug(name: string): string {
  return slugify(name)
}

export function getCategoryImageAlt(categoryName: string): string {
  return categoryName ? `Image catégorie ${categoryName}` : "Image catégorie"
}
