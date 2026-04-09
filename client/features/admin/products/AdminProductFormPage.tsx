"use client"

import {
  AlertCircle,
  ArrowLeft,
  Eye,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react"
import Image from "next/image"
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link, useRouter } from "@/i18n/navigation"

import { AdminProductImagesManager } from "./AdminProductImagesManager"
import {
  createAdminProduct,
  fetchAdminCategories,
  fetchAdminProductById,
  updateAdminProduct,
  updateAdminProductImages,
  uploadAdminProductImages,
} from "./adminProductsApi"
import {
  ADMIN_PRODUCT_TVA_OPTIONS,
  buildTechnicalCharacteristicsPayload,
  calculateProductPriceTtc,
  createInitialAdminProductFormValues,
  createEmptyTechnicalAttribute,
  mapProductToFormValues,
  parsePositiveNumber,
} from "./adminProductsUtils"
import type {
  AdminCategory,
  AdminProductFormValues,
  AdminProductImage,
} from "./adminProductsTypes"

type AdminProductFormPageProps = {
  mode: "create" | "edit"
  productId?: string
}

type AdminProductFieldErrors = {
  nom?: string
  prixHt?: string
  quantiteStock?: string
  slug?: string
}

type PendingProductImage = {
  id: string
  file: File
  previewUrl: string
  estPrincipale: boolean
  altText: string
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function buildPendingImageId(fileName: string, imageIndex: number): string {
  return `${fileName}-${imageIndex}-${Date.now()}`
}

function removePreviewUrls(images: PendingProductImage[]) {
  images.forEach((image) => {
    URL.revokeObjectURL(image.previewUrl)
  })
}

function sortPendingImages(
  images: PendingProductImage[],
): PendingProductImage[] {
  return [...images]
}

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
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<AdminProductFieldErrors>({})
  const [uploadedImageCount, setUploadedImageCount] = useState(0)
  const pendingImagesRef = useRef<PendingProductImage[]>([])

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
    pendingImagesRef.current = pendingImages
  }, [pendingImages])

  useEffect(() => {
    return () => {
      removePreviewUrls(pendingImagesRef.current)
    }
  }, [])

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

  function handleSimpleFieldChange<K extends keyof AdminProductFormValues>(
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

  function handlePendingImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files

    if (!selectedFiles || selectedFiles.length === 0) {
      return
    }

    setPendingImages((previousImages) => {
      const nextImages = [...previousImages]
      const hasMainImage = previousImages.some((image) => image.estPrincipale)

      Array.from(selectedFiles).forEach((file, imageIndex) => {
        const previewUrl = URL.createObjectURL(file)
        nextImages.push({
          id: buildPendingImageId(file.name, imageIndex),
          file,
          previewUrl,
          estPrincipale:
            !hasMainImage && previousImages.length === 0 && imageIndex === 0,
          altText: "",
        })
      })

      return nextImages
    })

    event.currentTarget.value = ""
  }

  function handlePendingImageMainSelection(imageId: string) {
    setPendingImages((previousImages) => {
      return previousImages.map((image) => ({
        ...image,
        estPrincipale: image.id === imageId,
      }))
    })
  }

  function handlePendingImageMove(imageId: string, direction: "up" | "down") {
    setPendingImages((previousImages) => {
      const currentIndex = previousImages.findIndex(
        (image) => image.id === imageId,
      )

      if (currentIndex < 0) {
        return previousImages
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= previousImages.length) {
        return previousImages
      }

      const nextImages = [...previousImages]
      const [movedImage] = nextImages.splice(currentIndex, 1)
      nextImages.splice(targetIndex, 0, movedImage)

      return nextImages
    })
  }

  function handlePendingImageDelete(imageId: string) {
    setPendingImages((previousImages) => {
      const imageToRemove = previousImages.find((image) => image.id === imageId)

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
      }

      const nextImages = previousImages.filter((image) => image.id !== imageId)
      const hasMainImage = nextImages.some((image) => image.estPrincipale)

      if (!hasMainImage && nextImages.length > 0) {
        nextImages[0] = {
          ...nextImages[0],
          estPrincipale: true,
        }
      }

      return nextImages
    })
  }

  function handlePendingImageAltTextUpdate(imageId: string, altText: string) {
    setPendingImages((previousImages) => {
      return previousImages.map((image) => {
        if (image.id !== imageId) {
          return image
        }

        return {
          ...image,
          altText,
        }
      })
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

    const orderedPendingImages = sortPendingImages(pendingImages)

    const uploadedImages = await uploadAdminProductImages(
      createdProductId,
      orderedPendingImages.map((image) => image.file),
    )

    const imagesWithMetadata = uploadedImages.map(
      (uploadedImage, imageIndex) => {
        const pendingImage = orderedPendingImages[imageIndex]

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
        removePreviewUrls(pendingImages)
        setPendingImages([])

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

      {errorMessage ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-brand-error/20 bg-red-50 p-4 text-sm text-brand-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {noticeMessage ? (
        <div
          className="rounded-lg border border-brand-success/20 bg-emerald-50 p-4 text-sm text-brand-success"
          role="status"
          aria-live="polite"
        >
          {noticeMessage}
          {uploadedImageCount > 0
            ? ` ${uploadedImageCount} image(s) uploadée(s).`
            : ""}
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Informations principales
            </CardTitle>
            <CardDescription>
              Identité, tarifs, stock et publication du produit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Nom du produit</span>
                <input
                  type="text"
                  value={formValues.nom}
                  onChange={(event) => {
                    handleSimpleFieldChange("nom", event.target.value)
                  }}
                  className="h-10 w-full rounded-md border border-border px-3"
                  aria-invalid={Boolean(fieldErrors.nom)}
                  aria-describedby={
                    fieldErrors.nom ? "admin-product-name-error" : undefined
                  }
                />
                {fieldErrors.nom ? (
                  <span
                    id="admin-product-name-error"
                    className="text-xs text-brand-error"
                  >
                    {fieldErrors.nom}
                  </span>
                ) : null}
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Slug SEO</span>
                <input
                  type="text"
                  value={formValues.slug}
                  onChange={(event) => {
                    handleSimpleFieldChange("slug", event.target.value)
                  }}
                  placeholder="exemple-produit-tech"
                  className="h-10 w-full rounded-md border border-border px-3"
                  aria-invalid={Boolean(fieldErrors.slug)}
                  aria-describedby={
                    fieldErrors.slug ? "admin-product-slug-error" : undefined
                  }
                />
                {fieldErrors.slug ? (
                  <span
                    id="admin-product-slug-error"
                    className="text-xs text-brand-error"
                  >
                    {fieldErrors.slug}
                  </span>
                ) : null}
              </label>
            </div>

            <label className="block space-y-1 text-sm text-slate-700">
              <span>Description</span>
              <textarea
                rows={4}
                value={formValues.description}
                onChange={(event) => {
                  handleSimpleFieldChange("description", event.target.value)
                }}
                className="w-full rounded-md border border-border px-3 py-2"
              />
            </label>

            <fieldset className="space-y-2 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium text-slate-700">
                Catégories
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => {
                  const isSelected = formValues.categoryIds.includes(
                    category.id_categorie,
                  )

                  return (
                    <label
                      key={category.id_categorie}
                      className="inline-flex items-center gap-2 rounded-md border border-border/80 px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          handleCategoryToggle(category.id_categorie)
                        }}
                      />
                      <span>{category.nom}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 md:grid-cols-4">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Prix HT</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formValues.prixHt}
                  onChange={(event) => {
                    handleSimpleFieldChange("prixHt", event.target.value)
                  }}
                  className="h-10 w-full rounded-md border border-border px-3"
                  aria-invalid={Boolean(fieldErrors.prixHt)}
                  aria-describedby={
                    fieldErrors.prixHt
                      ? "admin-product-prixht-error"
                      : undefined
                  }
                />
                {fieldErrors.prixHt ? (
                  <span
                    id="admin-product-prixht-error"
                    className="text-xs text-brand-error"
                  >
                    {fieldErrors.prixHt}
                  </span>
                ) : null}
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>TVA</span>
                <select
                  value={formValues.tva}
                  onChange={(event) => {
                    handleSimpleFieldChange(
                      "tva",
                      event.target.value as AdminProductFormValues["tva"],
                    )
                  }}
                  className="h-10 w-full rounded-md border border-border px-3"
                >
                  {ADMIN_PRODUCT_TVA_OPTIONS.map((tvaOption) => (
                    <option key={tvaOption.value} value={tvaOption.value}>
                      {tvaOption.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Prix TTC (auto)</span>
                <input
                  type="text"
                  value={computedPriceTtc}
                  readOnly
                  className="h-10 w-full rounded-md border border-border bg-slate-50 px-3"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Quantité en stock</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formValues.quantiteStock}
                  onChange={(event) => {
                    handleSimpleFieldChange("quantiteStock", event.target.value)
                  }}
                  className="h-10 w-full rounded-md border border-border px-3"
                  aria-invalid={Boolean(fieldErrors.quantiteStock)}
                  aria-describedby={
                    fieldErrors.quantiteStock
                      ? "admin-product-quantite-stock-error"
                      : undefined
                  }
                />
                {fieldErrors.quantiteStock ? (
                  <span
                    id="admin-product-quantite-stock-error"
                    className="text-xs text-brand-error"
                  >
                    {fieldErrors.quantiteStock}
                  </span>
                ) : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Statut</span>
                <select
                  value={formValues.statut}
                  onChange={(event) => {
                    handleSimpleFieldChange(
                      "statut",
                      event.target.value as AdminProductFormValues["statut"],
                    )
                  }}
                  className="h-10 w-full rounded-md border border-border px-3"
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="publie">Publié</option>
                </select>
              </label>

              <div className="flex items-end">
                <Badge
                  className={
                    formValues.statut === "publie"
                      ? "bg-brand-success text-white"
                      : "bg-slate-200 text-slate-700"
                  }
                >
                  {formValues.statut === "publie" ? "Publié" : "Brouillon"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Caractéristiques techniques
            </CardTitle>
            <CardDescription>
              Décrivez les propriétés techniques sous forme clé/valeur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {formValues.technicalAttributes.map((attribute) => (
              <div
                key={attribute.id}
                className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  type="text"
                  value={attribute.key}
                  onChange={(event) => {
                    handleTechnicalAttributeChange(
                      attribute.id,
                      "key",
                      event.target.value,
                    )
                  }}
                  placeholder="Ex: Puissance"
                  className="h-10 w-full rounded-md border border-border px-3"
                />
                <input
                  type="text"
                  value={attribute.value}
                  onChange={(event) => {
                    handleTechnicalAttributeChange(
                      attribute.id,
                      "value",
                      event.target.value,
                    )
                  }}
                  placeholder="Ex: 1200W"
                  className="h-10 w-full rounded-md border border-border px-3"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="text-brand-error hover:text-brand-error"
                  onClick={() => {
                    handleRemoveTechnicalAttribute(attribute.id)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Suppr.
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddTechnicalAttribute}
            >
              <Plus className="size-4" aria-hidden="true" />
              Ajouter une caractéristique
            </Button>
          </CardContent>
        </Card>

        {isEditMode && productId ? (
          <AdminProductImagesManager productId={productId} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-brand-nav">
                Images produit
              </CardTitle>
              <CardDescription>
                Ajoutez plusieurs images dès la création. Elles seront uploadées
                après enregistrement du produit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handlePendingImagesChange}
                />
                <span className="inline-flex items-center gap-2 rounded-md bg-brand-cta px-3 py-2 text-sm font-medium text-white">
                  <Upload className="size-4" aria-hidden="true" />
                  Sélectionner des images
                </span>
              </label>

              {pendingImages.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-slate-50 p-5 text-sm text-slate-600">
                  Aucune image sélectionnée pour le moment.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {pendingImages.map((pendingImage, imageIndex) => (
                    <article
                      key={pendingImage.id}
                      className="space-y-2 rounded-lg border border-border p-3"
                    >
                      <Image
                        src={pendingImage.previewUrl}
                        alt={`Prévisualisation ${imageIndex + 1}`}
                        width={640}
                        height={360}
                        className="h-32 w-full rounded-md object-cover"
                      />

                      {pendingImage.estPrincipale ? (
                        <Badge className="bg-brand-cta text-white">
                          Principale
                        </Badge>
                      ) : null}

                      <label className="block space-y-1 text-xs text-slate-600">
                        <span>Texte alternatif</span>
                        <input
                          type="text"
                          value={pendingImage.altText}
                          onChange={(event) => {
                            handlePendingImageAltTextUpdate(
                              pendingImage.id,
                              event.target.value,
                            )
                          }}
                          className="h-8 w-full rounded-md border border-border px-2 text-sm"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handlePendingImageMainSelection(pendingImage.id)
                          }}
                          disabled={pendingImage.estPrincipale}
                        >
                          Principale
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handlePendingImageMove(pendingImage.id, "up")
                          }}
                          disabled={imageIndex === 0}
                        >
                          Monter
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handlePendingImageMove(pendingImage.id, "down")
                          }}
                          disabled={imageIndex === pendingImages.length - 1}
                        >
                          Descendre
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-brand-error hover:text-brand-error"
                          onClick={() => {
                            handlePendingImageDelete(pendingImage.id)
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Supprimer
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
