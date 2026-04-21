import { adminFetch, parseApiResponse } from "@/features/admin/adminApi"

import type {
  AdminCarousel,
  AdminCarouselUploadVariant,
  AdminCarouselWritePayload,
} from "./adminCarouselsTypes"

type AdminCarouselsListResponse = {
  slides: AdminCarousel[]
}

type AdminCarouselResponse = {
  slide: AdminCarousel
}

type AdminCarouselUploadResponse = {
  url: string
  variant: AdminCarouselUploadVariant
}

export async function fetchAdminCarousels(): Promise<AdminCarousel[]> {
  const response = await adminFetch("/api/admin/carousel", {
    cache: "no-store",
  })

  const payload = await parseApiResponse<AdminCarouselsListResponse>(
    response,
    "Impossible de charger les slides du carrousel.",
  )

  return payload.slides
}

export async function fetchAdminCarouselById(
  slideId: string,
): Promise<AdminCarousel> {
  const response = await adminFetch(`/api/admin/carousel/${slideId}`, {
    cache: "no-store",
  })

  const payload = await parseApiResponse<AdminCarouselResponse>(
    response,
    "Impossible de charger ce slide.",
  )

  return payload.slide
}

export async function createAdminCarousel(
  payload: AdminCarouselWritePayload,
): Promise<AdminCarousel> {
  const response = await adminFetch("/api/admin/carousel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = await parseApiResponse<AdminCarouselResponse>(
    response,
    "Impossible de créer le slide.",
  )

  return data.slide
}

export async function updateAdminCarousel(
  slideId: string,
  payload: Partial<AdminCarouselWritePayload>,
): Promise<AdminCarousel> {
  const response = await adminFetch(`/api/admin/carousel/${slideId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = await parseApiResponse<AdminCarouselResponse>(
    response,
    "Impossible de modifier ce slide.",
  )

  return data.slide
}

export async function deleteAdminCarousel(slideId: string): Promise<void> {
  const response = await adminFetch(`/api/admin/carousel/${slideId}`, {
    method: "DELETE",
  })

  await parseApiResponse<{ success: boolean }>(
    response,
    "Impossible de supprimer ce slide.",
  )
}

export async function updateAdminCarouselStatus(
  slideId: string,
  actif: boolean,
): Promise<AdminCarousel> {
  const response = await adminFetch(`/api/admin/carousel/${slideId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actif }),
  })

  const data = await parseApiResponse<AdminCarouselResponse>(
    response,
    "Impossible de modifier le statut du slide.",
  )

  return data.slide
}

export async function reorderAdminCarousels(
  slides: Array<{ id: string; ordre: number }>,
): Promise<void> {
  const response = await adminFetch("/api/admin/carousel/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slides }),
  })

  await parseApiResponse<{ success: boolean }>(
    response,
    "Impossible de réorganiser les slides.",
  )
}

export async function uploadAdminCarouselImage(
  slideId: string,
  imageFile: File,
  variant: AdminCarouselUploadVariant,
): Promise<string> {
  const formData = new FormData()
  formData.append("file", imageFile)
  formData.append("variant", variant)

  const response = await adminFetch(`/api/admin/carousel/${slideId}/upload`, {
    method: "POST",
    body: formData,
  })

  const payload = await parseApiResponse<AdminCarouselUploadResponse>(
    response,
    "Impossible d'envoyer l'image du slide.",
  )

  return payload.url
}
