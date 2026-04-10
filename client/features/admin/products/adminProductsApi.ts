import { adminFetch, parseApiResponse } from "@/features/admin/adminApi"

import {
  buildAdminProductsQueryString,
  INITIAL_ADMIN_PRODUCT_FILTERS,
} from "./adminProductsUtils"
import type {
  AdminBulkAction,
  AdminBulkActionResponse,
  AdminCategory,
  AdminProduct,
  AdminProductImage,
  AdminProductListFilters,
  AdminProductStatus,
  AdminProductTva,
  AdminProductsListResponse,
} from "./adminProductsTypes"

type AdminProductWritePayload = {
  nom: string
  description: string
  prix_ht: number
  prix_ttc: number
  tva: AdminProductTva
  quantite_stock: number
  statut: AdminProductStatus
  slug: string
  categoryIds: string[]
  caracteristique_tech: Record<string, unknown> | null
}

type AdminProductResponse = {
  product: AdminProduct
}

type AdminProductImagesResponse = {
  images: AdminProductImage[]
}

type AdminCategoriesResponse = {
  categories: Array<{
    id_categorie: string
    nom: string
  }>
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const response = await adminFetch("/api/admin/categories", {
    cache: "no-store",
  })

  const payload = await parseApiResponse<AdminCategoriesResponse>(
    response,
    "Impossible de charger les catégories.",
  )

  return payload.categories.map((category) => ({
    id_categorie: category.id_categorie,
    nom: category.nom,
  }))
}

export async function fetchAdminProducts(
  filters: AdminProductListFilters,
): Promise<AdminProductsListResponse> {
  const queryString = buildAdminProductsQueryString(filters)
  const endpoint = queryString
    ? `/api/admin/produits?${queryString}`
    : "/api/admin/produits"

  const response = await adminFetch(endpoint, {
    cache: "no-store",
  })

  return parseApiResponse<AdminProductsListResponse>(
    response,
    "Impossible de charger la liste des produits.",
  )
}

export async function fetchAllFilteredProducts(
  filters: AdminProductListFilters,
): Promise<AdminProduct[]> {
  const collectedProducts: AdminProduct[] = []
  let currentPage = 1
  let totalPages = 1

  while (currentPage <= totalPages) {
    const pageResponse = await fetchAdminProducts({
      ...filters,
      page: currentPage,
    })

    collectedProducts.push(...pageResponse.products)
    totalPages = pageResponse.pagination.totalPages
    currentPage += 1
  }

  return collectedProducts
}

export async function fetchAdminProductById(
  productId: string,
): Promise<AdminProduct> {
  const response = await adminFetch(`/api/admin/produits/${productId}`, {
    cache: "no-store",
  })

  const payload = await parseApiResponse<AdminProductResponse>(
    response,
    "Impossible de charger ce produit.",
  )

  return payload.product
}

export async function createAdminProduct(
  payload: AdminProductWritePayload,
): Promise<AdminProduct> {
  const response = await adminFetch("/api/admin/produits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const productPayload = await parseApiResponse<AdminProductResponse>(
    response,
    "Impossible de créer le produit.",
  )

  return productPayload.product
}

export async function updateAdminProduct(
  productId: string,
  payload: Partial<AdminProductWritePayload>,
): Promise<AdminProduct> {
  const response = await adminFetch(`/api/admin/produits/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const productPayload = await parseApiResponse<AdminProductResponse>(
    response,
    "Impossible de modifier ce produit.",
  )

  return productPayload.product
}

export async function deleteAdminProduct(productId: string): Promise<void> {
  const response = await adminFetch(`/api/admin/produits/${productId}`, {
    method: "DELETE",
  })

  await parseApiResponse<{ success: boolean }>(
    response,
    "Impossible de supprimer ce produit.",
  )
}

export async function runAdminBulkProductsAction(payload: {
  action: AdminBulkAction
  productIds: string[]
  categoryId?: string
}): Promise<AdminBulkActionResponse> {
  const response = await adminFetch("/api/admin/produits/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return parseApiResponse<AdminBulkActionResponse>(
    response,
    "Impossible d'appliquer l'action groupée.",
  )
}

export async function fetchAdminProductImages(
  productId: string,
): Promise<AdminProductImage[]> {
  const response = await adminFetch(`/api/admin/produits/${productId}/images`, {
    cache: "no-store",
  })

  const payload = await parseApiResponse<AdminProductImagesResponse>(
    response,
    "Impossible de charger les images produit.",
  )

  return payload.images
}

export async function uploadAdminProductImages(
  productId: string,
  files: File[],
): Promise<AdminProductImage[]> {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append("files", file)
  })

  const response = await adminFetch(`/api/admin/produits/${productId}/images`, {
    method: "POST",
    body: formData,
  })

  const payload = await parseApiResponse<AdminProductImagesResponse>(
    response,
    "Impossible d'uploader les images produit.",
  )

  return payload.images
}

export async function updateAdminProductImages(
  productId: string,
  images: AdminProductImage[],
): Promise<AdminProductImage[]> {
  const response = await adminFetch(`/api/admin/produits/${productId}/images`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ images }),
  })

  const payload = await parseApiResponse<AdminProductImagesResponse>(
    response,
    "Impossible de mettre à jour les images produit.",
  )

  return payload.images
}

export async function deleteAdminProductImage(
  productId: string,
  imageUrl: string,
): Promise<AdminProductImage[]> {
  const response = await adminFetch(`/api/admin/produits/${productId}/images`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: imageUrl }),
  })

  const payload = await parseApiResponse<AdminProductImagesResponse>(
    response,
    "Impossible de supprimer cette image.",
  )

  return payload.images
}

export function createDefaultAdminProductFilters(): AdminProductListFilters {
  return {
    ...INITIAL_ADMIN_PRODUCT_FILTERS,
  }
}
