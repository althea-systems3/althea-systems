"use client"

import { ArrowLeft, Eye, Save } from "lucide-react"
import { type FormEvent, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AdminListErrorAlert,
  AdminListNoticeAlert,
} from "@/features/admin/shared"
import { Link, useRouter } from "@/i18n/navigation"

import { AdminProductImagesManager } from "./AdminProductImagesManager"
import {
  AdminProductMainInfoSection,
  type AdminProductFieldErrors,
} from "./AdminProductMainInfoSection"
import { AdminProductPendingImagesSection } from "./AdminProductPendingImagesSection"
import { AdminProductTechnicalAttributesSection } from "./AdminProductTechnicalAttributesSection"
import {
  createAdminProduct,
  fetchAdminCategories,
  fetchAdminProductById,
  updateAdminProduct,
  updateAdminProductImages,
  uploadAdminProductImages,
} from "./adminProductsApi"
import {
  buildTechnicalCharacteristicsPayload,
  calculateProductPriceTtc,
  createEmptyTechnicalAttribute,
  createInitialAdminProductFormValues,
  mapProductToFormValues,
  parsePositiveNumber,
} from "./adminProductsUtils"
import type {
  AdminCategory,
  AdminProductFormValues,
  AdminProductImage,
} from "./adminProductsTypes"
import { useAdminProductPendingImages } from "./useAdminProductPendingImages"

type AdminProductFormPageProps = {
  mode: "create" | "edit"
  productId?: string
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function AdminProductFormPage({
  mode,
  productId,
}: AdminProductFormPageProps) {
  const router = useRouter()
  const isEditMode = mode === "edit"

  const [formValues, setFormValues] = useState<AdminProductFormValues>(
    createInitialAdminProductFormValues,
  )
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<AdminProductFieldErrors>({})
  const [uploadedImageCount, setUploadedImageCount] = useState(0)

  const {
    pendingImages,
    handlePendingImagesChange,
    handlePendingImageMainSelection,
    handlePendingImageMove,
    handlePendingImageDelete,
    handlePendingImageAltTextUpdate,
    clearPendingImages,
  } = useAdminProductPendingImages()

  const pageTitle = isEditMode ? "Édition produit" : "Nouveau produit"
  const pageDescription = isEditMode
    ? "Modifiez les informations du produit, son stock et ses médias."
    : "Créez un produit complet avec ses caractéristiques et ses images."

  const parsedPriceHt = parsePositiveNumber(formValues.prixHt)
  const computedPriceTtc = useMemo(() => {
    if (parsedPriceHt === null) {
      return ""
    }

    return calculateProductPriceTtc(parsedPriceHt, formValues.tva).toFixed(2)
  }, [formValues.tva, parsedPriceHt])

  useEffect(() => {
    let isCancelled = false

    async function bootstrapPage() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [fetchedCategories, fetchedProduct] = await Promise.all([
          fetchAdminCategories(),
          isEditMode && productId
            ? fetchAdminProductById(productId)
            : Promise.resolve(null),
        ])

        if (isCancelled) {
          return
        }

        setCategories(fetchedCategories)

        if (fetchedProduct) {
          setFormValues(mapProductToFormValues(fetchedProduct))
        }
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le formulaire produit.",
        )
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void bootstrapPage()

    return () => {
      isCancelled = true
    }
  }, [isEditMode, productId])

  function handleFieldChange<K extends keyof AdminProductFormValues>(
    fieldName: K,
    fieldValue: AdminProductFormValues[K],
  ) {
    setFormValues((previousFormValues) => ({
      ...previousFormValues,
      [fieldName]: fieldValue,
    }))

    setFieldErrors((previousErrors) => {
      if (!previousErrors[fieldName as keyof AdminProductFieldErrors]) {
        return previousErrors
      }

      return {
        ...previousErrors,
        [fieldName]: undefined,
      }
    })
  }

  function handleCategoryToggle(categoryId: string) {
    setFormValues((previousFormValues) => {
      const hasCategory = previousFormValues.categoryIds.includes(categoryId)

      if (hasCategory) {
        return {
          ...previousFormValues,
          categoryIds: previousFormValues.categoryIds.filter(
            (selectedCategoryId) => selectedCategoryId !== categoryId,
          ),
        }
      }

      return {
        ...previousFormValues,
        categoryIds: [...previousFormValues.categoryIds, categoryId],
      }
    })
  }

  function handleTechnicalAttributeChange(
    attributeId: string,
    fieldName: "key" | "value",
    fieldValue: string,
  ) {
    setFormValues((previousFormValues) => ({
      ...previousFormValues,
      technicalAttributes: previousFormValues.technicalAttributes.map(
        (attribute) => {
          if (attribute.id !== attributeId) {
            return attribute
          }

          return {
            ...attribute,
            [fieldName]: fieldValue,
          }
        },
      ),
    }))
  }

  function handleAddTechnicalAttribute() {
    setFormValues((previousFormValues) => ({
      ...previousFormValues,
      technicalAttributes: [
        ...previousFormValues.technicalAttributes,
        createEmptyTechnicalAttribute(
          `technical-attribute-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ),
      ],
    }))
  }

  function handleRemoveTechnicalAttribute(attributeId: string) {
    setFormValues((previousFormValues) => {
      const remainingAttributes = previousFormValues.technicalAttributes.filter(
        (attribute) => attribute.id !== attributeId,
      )

      return {
        ...previousFormValues,
        technicalAttributes:
          remainingAttributes.length > 0
            ? remainingAttributes
            : [createEmptyTechnicalAttribute()],
      }
    })
  }

  function validateFormValues(): boolean {
    const nextFieldErrors: AdminProductFieldErrors = {}

    if (!formValues.nom.trim()) {
      nextFieldErrors.nom = "Le nom du produit est obligatoire."
    }

    if (parsedPriceHt === null) {
      nextFieldErrors.prixHt = "Le prix HT doit être un nombre positif."
    }

    const parsedStockQuantity = parsePositiveNumber(formValues.quantiteStock)

    if (parsedStockQuantity === null) {
      nextFieldErrors.quantiteStock =
        "La quantité en stock doit être un nombre positif."
    }

    if (
      formValues.slug.trim().length > 0 &&
      !SLUG_PATTERN.test(formValues.slug.trim())
    ) {
      nextFieldErrors.slug = "Le slug SEO doit être au format kebab-case."
    }

    setFieldErrors(nextFieldErrors)

    return Object.keys(nextFieldErrors).length === 0
  }

  async function uploadPendingCreateImages(createdProductId: string) {
    if (pendingImages.length === 0) {
      return
    }

    const uploadedImages = await uploadAdminProductImages(
      createdProductId,
      pendingImages.map((image) => image.file),
    )

    const imagesWithMetadata = uploadedImages.map(
      (uploadedImage, imageIndex) => {
        const pendingImage = pendingImages[imageIndex]

        return {
          ...uploadedImage,
          ordre: imageIndex,
          est_principale: pendingImage
            ? pendingImage.estPrincipale
            : imageIndex === 0,
          alt_text: pendingImage?.altText.trim() || null,
        } as AdminProductImage
      },
    )

    await updateAdminProductImages(createdProductId, imagesWithMetadata)

    setUploadedImageCount(imagesWithMetadata.length)
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()

    if (!validateFormValues()) {
      setErrorMessage("Le formulaire contient des erreurs.")
      setNoticeMessage(null)
      return
    }

    if (!productId && isEditMode) {
      setErrorMessage("Identifiant produit manquant pour la mise à jour.")
      return
    }

    const parsedStockQuantity = parsePositiveNumber(formValues.quantiteStock)

    if (parsedPriceHt === null || parsedStockQuantity === null) {
      return
    }

    const payload = {
      nom: formValues.nom.trim(),
      description: formValues.description.trim(),
      categoryIds: formValues.categoryIds,
      prix_ht: parsedPriceHt,
      prix_ttc: calculateProductPriceTtc(parsedPriceHt, formValues.tva),
      tva: formValues.tva,
      quantite_stock: Math.round(parsedStockQuantity),
      statut: formValues.statut,
      slug: formValues.slug.trim(),
      caracteristique_tech: buildTechnicalCharacteristicsPayload(
        formValues.technicalAttributes,
      ),
    }

    setIsSaving(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      if (isEditMode && productId) {
        await updateAdminProduct(productId, payload)

        setNoticeMessage("Produit modifié avec succès.")
      } else {
        const createdProduct = await createAdminProduct(payload)

        await uploadPendingCreateImages(createdProduct.id_produit)
        clearPendingImages()

        router.push(`/admin/produits/${createdProduct.id_produit}`)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de sauvegarder le produit.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-4" aria-labelledby="admin-product-form-title">
        <h1
          id="admin-product-form-title"
          className="heading-font text-2xl text-brand-nav"
        >
          {pageTitle}
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement du formulaire produit...
          </CardContent>
        </Card>
      </section>
    )
  }

  const noticeWithUploadInfo =
    noticeMessage && uploadedImageCount > 0
      ? `${noticeMessage} ${uploadedImageCount} image(s) uploadée(s).`
      : noticeMessage

  return (
    <section className="space-y-6" aria-labelledby="admin-product-form-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-product-form-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            {pageTitle}
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            {pageDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/produits">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour liste
            </Link>
          </Button>

          {isEditMode && productId ? (
            <Button asChild variant="outline">
              <Link href={`/admin/produits/${productId}`}>
                <Eye className="size-4" aria-hidden="true" />
                Voir détail
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <AdminListErrorAlert message={errorMessage} />
      <AdminListNoticeAlert message={noticeWithUploadInfo} />

      <form className="space-y-6" onSubmit={handleSubmit}>
        <AdminProductMainInfoSection
          formValues={formValues}
          categories={categories}
          fieldErrors={fieldErrors}
          computedPriceTtc={computedPriceTtc}
          onFieldChange={handleFieldChange}
          onCategoryToggle={handleCategoryToggle}
        />

        <AdminProductTechnicalAttributesSection
          technicalAttributes={formValues.technicalAttributes}
          onAttributeChange={handleTechnicalAttributeChange}
          onAddAttribute={handleAddTechnicalAttribute}
          onRemoveAttribute={handleRemoveTechnicalAttribute}
        />

        {isEditMode && productId ? (
          <AdminProductImagesManager productId={productId} />
        ) : (
          <AdminProductPendingImagesSection
            pendingImages={pendingImages}
            onPendingImagesChange={handlePendingImagesChange}
            onPendingImageMainSelection={handlePendingImageMainSelection}
            onPendingImageMove={handlePendingImageMove}
            onPendingImageDelete={handlePendingImageDelete}
            onPendingImageAltTextUpdate={handlePendingImageAltTextUpdate}
          />
        )}

        <div className="sticky bottom-4 z-10 rounded-xl border border-border bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="submit" disabled={isSaving}>
              <Save className="size-4" aria-hidden="true" />
              {isSaving
                ? "Enregistrement..."
                : isEditMode
                  ? "Enregistrer les modifications"
                  : "Créer le produit"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
