"use client"

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Star,
  Trash2,
  Upload,
} from "lucide-react"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  deleteAdminProductImage,
  fetchAdminProductImages,
  updateAdminProductImages,
  uploadAdminProductImages,
} from "./adminProductsApi"
import type { AdminProductImage } from "./adminProductsTypes"

type AdminProductImagesManagerProps = {
  productId: string
  onImagesChange?: (images: AdminProductImage[]) => void
}

function normalizeImagesForSave(
  images: AdminProductImage[],
): AdminProductImage[] {
  const normalizedImages = images.map((image, index) => ({
    ...image,
    ordre: index,
  }))

  const hasMainImage = normalizedImages.some((image) => image.est_principale)

  if (!hasMainImage && normalizedImages.length > 0) {
    normalizedImages[0] = {
      ...normalizedImages[0],
      est_principale: true,
    }
  }

  return normalizedImages
}

export function AdminProductImagesManager({
  productId,
  onImagesChange,
}: AdminProductImagesManagerProps) {
  const [images, setImages] = useState<AdminProductImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const imageCount = images.length

  useEffect(() => {
    async function loadImages() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const fetchedImages = await fetchAdminProductImages(productId)
        setImages(fetchedImages)
        onImagesChange?.(fetchedImages)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les images du produit.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadImages()
  }, [onImagesChange, productId])

  const sortedImages = useMemo(() => {
    return [...images].sort((imageA, imageB) => imageA.ordre - imageB.ordre)
  }, [images])

  async function handlePersistImages(nextImages: AdminProductImage[]) {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const normalizedImages = normalizeImagesForSave(nextImages)
      const savedImages = await updateAdminProductImages(
        productId,
        normalizedImages,
      )
      setImages(savedImages)
      onImagesChange?.(savedImages)
      setNoticeMessage("Images mises à jour.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour les images.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const uploadedImages = await uploadAdminProductImages(
        productId,
        Array.from(fileList),
      )

      setImages(uploadedImages)
      onImagesChange?.(uploadedImages)
      setNoticeMessage("Images uploadées avec succès.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'uploader les images.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteImage(imageUrl: string) {
    const shouldDelete = window.confirm(
      "Supprimer cette image produit ? Cette action est irréversible.",
    )

    if (!shouldDelete) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const remainingImages = await deleteAdminProductImage(productId, imageUrl)
      setImages(remainingImages)
      onImagesChange?.(remainingImages)
      setNoticeMessage("Image supprimée.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cette image.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSetMainImage(imageUrl: string) {
    const nextImages = sortedImages.map((image) => ({
      ...image,
      est_principale: image.url === imageUrl,
    }))

    await handlePersistImages(nextImages)
  }

  async function handleMoveImage(imageUrl: string, direction: "up" | "down") {
    const currentIndex = sortedImages.findIndex(
      (image) => image.url === imageUrl,
    )

    if (currentIndex < 0) {
      return
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= sortedImages.length) {
      return
    }

    const reorderedImages = [...sortedImages]
    const [movedImage] = reorderedImages.splice(currentIndex, 1)
    reorderedImages.splice(targetIndex, 0, movedImage)

    await handlePersistImages(reorderedImages)
  }

  async function handleAltTextUpdate(imageUrl: string, altTextValue: string) {
    const nextImages = sortedImages.map((image) => {
      if (image.url !== imageUrl) {
        return image
      }

      return {
        ...image,
        alt_text: altTextValue.trim() || null,
      }
    })

    await handlePersistImages(nextImages)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-brand-nav">Images produit</CardTitle>
        <CardDescription>
          Upload multiple, image principale, réorganisation et suppression.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-brand-error/20 bg-red-50 p-3 text-sm text-brand-error"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {noticeMessage ? (
          <div
            className="rounded-lg border border-brand-success/20 bg-emerald-50 p-3 text-sm text-brand-success"
            role="status"
            aria-live="polite"
          >
            {noticeMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                void handleUploadFiles(event.target.files)
                event.currentTarget.value = ""
              }}
              disabled={isSaving}
            />
            <span className="inline-flex items-center gap-2 rounded-md bg-brand-cta px-3 py-2 text-sm font-medium text-white">
              <Upload className="size-4" aria-hidden="true" />
              Ajouter des images
            </span>
          </label>

          <Badge variant="outline" className="text-slate-600">
            {isLoading ? "Chargement..." : `${imageCount} image(s)`}
          </Badge>
        </div>

        {!isLoading && sortedImages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-slate-50 p-6 text-center text-sm text-slate-600">
            Aucune image pour ce produit. Ajoutez-en pour enrichir la fiche.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedImages.map((image, index) => (
            <article
              key={image.url}
              className="space-y-3 rounded-lg border border-border bg-white p-3"
            >
              <div className="relative overflow-hidden rounded-md bg-slate-100">
                <Image
                  src={image.url}
                  alt={image.alt_text ?? `Image produit ${index + 1}`}
                  width={640}
                  height={360}
                  className="h-36 w-full object-cover"
                />
                {image.est_principale ? (
                  <Badge className="absolute left-2 top-2 bg-brand-cta text-white">
                    Principale
                  </Badge>
                ) : null}
              </div>

              <label className="block space-y-1 text-xs text-slate-600">
                <span>Texte alternatif</span>
                <input
                  type="text"
                  defaultValue={image.alt_text ?? ""}
                  className="h-9 w-full rounded-md border border-border px-2 text-sm"
                  onBlur={(event) => {
                    void handleAltTextUpdate(
                      image.url,
                      event.currentTarget.value,
                    )
                  }}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleSetMainImage(image.url)
                  }}
                  disabled={isSaving || image.est_principale}
                >
                  {image.est_principale ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Star className="size-3.5" aria-hidden="true" />
                  )}
                  Principale
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleMoveImage(image.url, "up")
                  }}
                  disabled={isSaving || index === 0}
                >
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                  Monter
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleMoveImage(image.url, "down")
                  }}
                  disabled={isSaving || index === sortedImages.length - 1}
                >
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                  Descendre
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-brand-error hover:text-brand-error"
                  onClick={() => {
                    void handleDeleteImage(image.url)
                  }}
                  disabled={isSaving}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Supprimer
                </Button>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
