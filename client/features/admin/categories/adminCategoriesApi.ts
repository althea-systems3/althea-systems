import { adminFetch, parseApiResponse } from "@/features/admin/adminApi"

import {
  buildAdminCategoriesQueryString,
  createDefaultAdminCategoriesFilters,
} from "./adminCategoriesUtils"
import type {
  AdminCategoriesBulkAction,
  AdminCategoriesFilters,
  AdminCategory,
  AdminCategoryDetailPayload,
  AdminCategoryWritePayload,
} from "./adminCategoriesTypes"

type AdminCategoriesListResponse = {
  categories: AdminCategory[]
}

type AdminCategoryResponse = {
  category: AdminCategory
}

type AdminBulkResponse = {
  success: boolean
  action: AdminCategoriesBulkAction
  affectedCount: number
}

type AdminCategoryUploadResponse = {
  url: string
}

export async function fetchAdminCategories(
  filters: AdminCategoriesFilters,
): Promise<AdminCategory[]> {
  const queryString = buildAdminCategoriesQueryString(filters)
  const endpoint = queryString
    ? `/api/admin/categories?${queryString}`
    : "/api/admin/categories"

  const response = await adminFetch(endpoint, { cache: "no-store" })

  const payload = await parseApiResponse<AdminCategoriesListResponse>(
    response,
    "Impossible de charger les catégories.",
  )

  return payload.categories
}

export async function fetchAdminCategoryById(
  categoryId: string,
): Promise<AdminCategoryDetailPayload> {
  const response = await adminFetch(`/api/admin/categories/${categoryId}`, {
    cache: "no-store",
  })

  return parseApiResponse<AdminCategoryDetailPayload>(
    response,
    "Impossible de charger cette catégorie.",
  )
}

export async function createAdminCategory(
  payload: AdminCategoryWritePayload,
): Promise<AdminCategory> {
  const response = await adminFetch("/api/admin/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = await parseApiResponse<AdminCategoryResponse>(
    response,
    "Impossible de créer la catégorie.",
  )

  return data.category
}

export async function updateAdminCategory(
  categoryId: string,
  payload: Partial<AdminCategoryWritePayload>,
): Promise<AdminCategory> {
  const response = await adminFetch(`/api/admin/categories/${categoryId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = await parseApiResponse<AdminCategoryResponse>(
    response,
    "Impossible de modifier cette catégorie.",
  )

  return data.category
}

export async function deleteAdminCategory(categoryId: string): Promise<void> {
  const response = await adminFetch(`/api/admin/categories/${categoryId}`, {
    method: "DELETE",
  })

  await parseApiResponse<{ success: boolean }>(
    response,
    "Impossible de supprimer cette catégorie.",
  )
}

export async function reorderAdminCategories(
  categories: Array<{ id: string; ordre_affiche: number }>,
): Promise<void> {
  const response = await adminFetch("/api/admin/categories/reorder", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categories }),
  })

  await parseApiResponse<{ success: boolean }>(
    response,
    "Impossible de réorganiser les catégories.",
  )
}

export async function runAdminCategoriesBulkStatusAction(payload: {
  action: AdminCategoriesBulkAction
  categoryIds: string[]
}): Promise<AdminBulkResponse> {
  const response = await adminFetch("/api/admin/categories/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return parseApiResponse<AdminBulkResponse>(
    response,
    "Impossible de modifier le statut des catégories sélectionnées.",
  )
}

export async function uploadAdminCategoryImage(
  categoryId: string,
  imageFile: File,
): Promise<string> {
  const formData = new FormData()
  formData.append("file", imageFile)

  const response = await adminFetch(
    `/api/admin/categories/${categoryId}/upload`,
    {
      method: "POST",
      body: formData,
    },
  )

  const payload = await parseApiResponse<AdminCategoryUploadResponse>(
    response,
    "Impossible d'envoyer l'image de la catégorie.",
  )

  return payload.url
}

export async function deleteAdminCategoryImage(
  categoryId: string,
): Promise<void> {
  const response = await adminFetch(
    `/api/admin/categories/${categoryId}/image`,
    {
      method: "DELETE",
    },
  )

  await parseApiResponse<{ success: boolean }>(
    response,
    "Impossible de supprimer l'image de la catégorie.",
  )
}

export function getDefaultAdminCategoriesFilters(): AdminCategoriesFilters {
  return createDefaultAdminCategoriesFilters()
}
