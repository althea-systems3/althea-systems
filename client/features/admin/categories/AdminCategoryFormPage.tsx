"use client"

import {
  AlertCircle,
  ArrowLeft,
  Eye,
  ImagePlus,
  Save,
  Trash2,
  Upload,
} from "lucide-react"
import Image from "next/image"
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
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
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"

import {
  createAdminCategory,
  deleteAdminCategoryImage,
  fetchAdminCategoryById,
  updateAdminCategory,
  uploadAdminCategoryImage,
} from "./adminCategoriesApi"
import type {
  AdminCategory,
  AdminCategoryStatus,
  AdminCategoryWritePayload,
} from "./adminCategoriesTypes"
import {
  ADMIN_CATEGORY_SLUG_PATTERN,
  generateCategorySlug,
  getCategoryImageAlt,
  mapCategoryStatusUi,
} from "./adminCategoriesUtils"

type AdminCategoryFormPageProps = {
  mode: "create" | "edit"
  categoryId?: string
}

type AdminCategoryFormValues = {
  nom: string
  description: string
  slug: string
  statut: AdminCategoryStatus
  imageUrl: string | null
}

type AdminCategoryFieldErrors = {
  nom?: string
  slug?: string
  description?: string
}

const NOM_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

function createDefaultFormValues(): AdminCategoryFormValues {
  return {
    nom: "",
    description: "",
    slug: "",
    statut: "active",
    imageUrl: null,
  }
}

function mapCategoryToFormValues(
  category: AdminCategory,
): AdminCategoryFormValues {
  return {
    nom: category.nom,
    description: category.description ?? "",
    slug: category.slug,
    statut: category.statut,
    imageUrl: category.image_url,
  }
}

export function AdminCategoryFormPage({
  mode,
  categoryId,
}: AdminCategoryFormPageProps) {
  const router = useRouter()
  const isEditMode = mode === "edit"

  const [formValues, setFormValues] = useState<AdminCategoryFormValues>(
    createDefaultFormValues,
  )
  const [fieldErrors, setFieldErrors] = useState<AdminCategoryFieldErrors>({})

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<
    string | null
  >(null)

  const pendingPreviewRef = useRef<string | null>(null)

  const pageTitle = isEditMode ? "Édition catégorie" : "Nouvelle catégorie"
  const pageDescription = isEditMode
    ? "Modifiez les informations de la catégorie et son image."
    : "Créez une catégorie avec son statut, son slug et son image."

  useEffect(() => {
    pendingPreviewRef.current = pendingImagePreviewUrl
  }, [pendingImagePreviewUrl])

  useEffect(() => {
    return () => {
      if (pendingPreviewRef.current) {
        URL.revokeObjectURL(pendingPreviewRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function bootstrapForm() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        if (isEditMode && categoryId) {
          const payload = await fetchAdminCategoryById(categoryId)

          if (isCancelled) {
            return
          }

          setFormValues(mapCategoryToFormValues(payload.category))
          setIsSlugManuallyEdited(true)
        } else {
          setFormValues(createDefaultFormValues())
          setIsSlugManuallyEdited(false)
        }
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le formulaire catégorie.",
        )
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void bootstrapForm()

    return () => {
      isCancelled = true
    }
  }, [categoryId, isEditMode])

  function updateFormField<K extends keyof AdminCategoryFormValues>(
    fieldName: K,
    fieldValue: AdminCategoryFormValues[K],
  ) {
    setFormValues((previousValues) => ({
      ...previousValues,
      [fieldName]: fieldValue,
    }))

    setFieldErrors((previousErrors) => {
      if (!previousErrors[fieldName as keyof AdminCategoryFieldErrors]) {
        return previousErrors
      }

      return {
        ...previousErrors,
        [fieldName]: undefined,
      }
    })
  }

  function handleNameChange(nextName: string) {
    setFormValues((previousValues) => {
      const nextValues = {
        ...previousValues,
        nom: nextName,
      }

      if (!isSlugManuallyEdited) {
        nextValues.slug = generateCategorySlug(nextName)
      }

      return nextValues
    })

    setFieldErrors((previousErrors) => ({
      ...previousErrors,
      nom: undefined,
      slug: undefined,
    }))
  }

  function validateFormValues(): boolean {
    const nextErrors: AdminCategoryFieldErrors = {}

    if (!formValues.nom.trim()) {
      nextErrors.nom = "Le nom de la catégorie est obligatoire."
    } else if (formValues.nom.trim().length > NOM_MAX_LENGTH) {
      nextErrors.nom = `Le nom ne doit pas dépasser ${NOM_MAX_LENGTH} caractères.`
    }

    if (!formValues.slug.trim()) {
      nextErrors.slug = "Le slug est obligatoire."
    } else if (!ADMIN_CATEGORY_SLUG_PATTERN.test(formValues.slug.trim())) {
      nextErrors.slug =
        "Le slug doit être en kebab-case (ex: reseau-industriel)."
    }

    if (formValues.description.length > DESCRIPTION_MAX_LENGTH) {
      nextErrors.description = `La description ne doit pas dépasser ${DESCRIPTION_MAX_LENGTH} caractères.`
    }

    setFieldErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  function handlePendingImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null

    if (!selectedFile) {
      return
    }

    if (pendingPreviewRef.current) {
      URL.revokeObjectURL(pendingPreviewRef.current)
    }

    const previewUrl = URL.createObjectURL(selectedFile)
    setPendingImageFile(selectedFile)
    setPendingImagePreviewUrl(previewUrl)
    setNoticeMessage("Nouvelle image prête à être enregistrée.")
    setErrorMessage(null)

    event.currentTarget.value = ""
  }

  async function handleImageUploadForEditMode(file: File) {
    if (!categoryId) {
      return
    }

    setIsUploadingImage(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const uploadedUrl = await uploadAdminCategoryImage(categoryId, file)
      updateFormField("imageUrl", uploadedUrl)
      setNoticeMessage("Image catégorie mise à jour.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer l'image de la catégorie.",
      )
    } finally {
      setIsUploadingImage(false)
    }
  }

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null

    if (!selectedFile) {
      return
    }

    if (isEditMode) {
      await handleImageUploadForEditMode(selectedFile)
      event.currentTarget.value = ""
      return
    }

    handlePendingImageSelection(event)
  }

  async function handleRemoveImage() {
    if (!isEditMode) {
      setPendingImageFile(null)

      if (pendingPreviewRef.current) {
        URL.revokeObjectURL(pendingPreviewRef.current)
      }

      setPendingImagePreviewUrl(null)
      setNoticeMessage("Image retirée du formulaire de création.")
      return
    }

    if (!categoryId) {
      return
    }

    const shouldDelete = await confirmCriticalAction({
      title: "Supprimer l'image",
      message: "Supprimer l'image de cette catégorie ?",
      confirmLabel: "Supprimer",
      tone: "danger",
    })

    if (!shouldDelete) {
      return
    }

    setIsRemovingImage(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await deleteAdminCategoryImage(categoryId)
      updateFormField("imageUrl", null)
      setNoticeMessage("Image catégorie supprimée.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer l'image de la catégorie.",
      )
    } finally {
      setIsRemovingImage(false)
    }
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()

    if (!validateFormValues()) {
      setErrorMessage("Le formulaire contient des erreurs.")
      return
    }

    const payload: AdminCategoryWritePayload = {
      nom: formValues.nom.trim(),
      description: formValues.description.trim() || null,
      slug: formValues.slug.trim(),
      statut: formValues.statut,
      image_url: formValues.imageUrl,
    }

    setIsSaving(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      if (isEditMode && categoryId) {
        await updateAdminCategory(categoryId, payload)
        setNoticeMessage("Catégorie modifiée avec succès.")
      } else {
        const createdCategory = await createAdminCategory(payload)

        if (pendingImageFile) {
          await uploadAdminCategoryImage(
            createdCategory.id_categorie,
            pendingImageFile,
          )
        }

        router.push(`/admin/categories/${createdCategory.id_categorie}`)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la catégorie.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-category-form-title"
      >
        <h1
          id="admin-category-form-title"
          className="heading-font text-2xl text-brand-nav"
        >
          {pageTitle}
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement du formulaire catégorie...
          </CardContent>
        </Card>
      </section>
    )
  }

  const statusUi = mapCategoryStatusUi(formValues.statut)
  const previewImageUrl = isEditMode
    ? formValues.imageUrl
    : (pendingImagePreviewUrl ?? formValues.imageUrl)

  return (
    <section className="space-y-6" aria-labelledby="admin-category-form-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-category-form-title"
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
            <Link href="/admin/categories">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour liste
            </Link>
          </Button>

          {isEditMode && categoryId ? (
            <Button asChild variant="outline">
              <Link href={`/admin/categories/${categoryId}`}>
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
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-brand-nav">
                Informations catégorie
              </CardTitle>
              <CardDescription>
                Nom, description, slug, statut et image de la catégorie.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Nom</span>
                <input
                  type="text"
                  value={formValues.nom}
                  onChange={(event) => {
                    handleNameChange(event.target.value)
                  }}
                  className="h-10 w-full rounded-md border border-border px-3"
                  aria-invalid={Boolean(fieldErrors.nom)}
                  aria-describedby={
                    fieldErrors.nom ? "admin-category-name-error" : undefined
                  }
                />
                {fieldErrors.nom ? (
                  <span
                    id="admin-category-name-error"
                    className="text-xs text-brand-error"
                  >
                    {fieldErrors.nom}
                  </span>
                ) : null}
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>Description</span>
                <textarea
                  rows={5}
                  value={formValues.description}
                  onChange={(event) => {
                    updateFormField("description", event.target.value)
                  }}
                  className="w-full rounded-md border border-border px-3 py-2"
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={
                    fieldErrors.description
                      ? "admin-category-description-error"
                      : undefined
                  }
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {formValues.description.length}/{DESCRIPTION_MAX_LENGTH}
                  </span>
                  {fieldErrors.description ? (
                    <span
                      id="admin-category-description-error"
                      className="text-brand-error"
                    >
                      {fieldErrors.description}
                    </span>
                  ) : null}
                </div>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-700">
                  <span>Slug</span>
                  <input
                    type="text"
                    value={formValues.slug}
                    onChange={(event) => {
                      setIsSlugManuallyEdited(true)
                      updateFormField("slug", event.target.value)
                    }}
                    className="h-10 w-full rounded-md border border-border px-3"
                    aria-invalid={Boolean(fieldErrors.slug)}
                    aria-describedby={
                      fieldErrors.slug ? "admin-category-slug-error" : undefined
                    }
                  />
                  {fieldErrors.slug ? (
                    <span
                      id="admin-category-slug-error"
                      className="text-xs text-brand-error"
                    >
                      {fieldErrors.slug}
                    </span>
                  ) : null}
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>Statut</span>
                  <select
                    value={formValues.statut}
                    onChange={(event) => {
                      updateFormField(
                        "statut",
                        event.target.value as AdminCategoryStatus,
                      )
                    }}
                    className="h-10 w-full rounded-md border border-border px-3"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium text-slate-700">
                  Image catégorie
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        void handleImageSelection(event)
                      }}
                      disabled={isUploadingImage || isRemovingImage}
                    />
                    <span className="inline-flex items-center gap-2 rounded-md bg-brand-cta px-3 py-2 text-sm font-medium text-white">
                      {isEditMode ? (
                        <Upload className="size-4" aria-hidden="true" />
                      ) : (
                        <ImagePlus className="size-4" aria-hidden="true" />
                      )}
                      {isEditMode ? "Remplacer l'image" : "Ajouter une image"}
                    </span>
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void handleRemoveImage()
                    }}
                    disabled={isUploadingImage || isRemovingImage}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {isRemovingImage ? "Suppression..." : "Supprimer l'image"}
                  </Button>
                </div>

                {isUploadingImage ? (
                  <p className="text-xs text-slate-500">
                    Upload image en cours...
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-4 z-10 rounded-xl border border-border bg-white/95 p-3 shadow-sm backdrop-blur">
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving || isUploadingImage}>
                <Save className="size-4" aria-hidden="true" />
                {isSaving
                  ? "Enregistrement..."
                  : isEditMode
                    ? "Enregistrer les modifications"
                    : "Créer la catégorie"}
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-brand-nav">Aperçu</CardTitle>
              <CardDescription>
                Vérifiez le rendu de la catégorie avant sauvegarde.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-border">
                {previewImageUrl ? (
                  <Image
                    src={previewImageUrl}
                    alt={getCategoryImageAlt(formValues.nom)}
                    width={640}
                    height={360}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-slate-50 text-sm text-slate-500">
                    Aucune image
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-brand-nav">
                  {formValues.nom || "Nom de catégorie"}
                </p>
                <p className="text-xs text-slate-500">
                  /{formValues.slug || "slug-categorie"}
                </p>
                <Badge className={statusUi.className}>{statusUi.label}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
