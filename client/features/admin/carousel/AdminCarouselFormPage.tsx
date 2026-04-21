"use client"

import { AlertCircle, ArrowLeft, ImagePlus, Save } from "lucide-react"
import Image from "next/image"
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useRouter } from "@/i18n/navigation"

import {
  createAdminCarousel,
  fetchAdminCarouselById,
  updateAdminCarousel,
  uploadAdminCarouselImage,
} from "./adminCarouselsApi"
import type {
  AdminCarousel,
  AdminCarouselWritePayload,
} from "./adminCarouselsTypes"
import {
  ADMIN_CAROUSEL_TITLE_MAX_LENGTH,
  isInternalRedirectUrl,
} from "./adminCarouselsUtils"

type Mode = "create" | "edit"

type AdminCarouselFormPageProps = {
  mode: Mode
  slideId?: string
}

const DEFAULT_FORM_VALUES: AdminCarouselWritePayload = {
  titre: "",
  texte: "",
  lien_redirection: "",
  actif: true,
  image_url: null,
}

export function AdminCarouselFormPage({
  mode,
  slideId,
}: AdminCarouselFormPageProps) {
  const router = useRouter()

  const [formValues, setFormValues] =
    useState<AdminCarouselWritePayload>(DEFAULT_FORM_VALUES)
  const [createdSlide, setCreatedSlide] = useState<AdminCarousel | null>(null)
  const [isLoading, setIsLoading] = useState(mode === "edit")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false)
  const [isUploadingMobile, setIsUploadingMobile] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== "edit" || !slideId) return

    let isCancelled = false

    async function loadSlide() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const slide = await fetchAdminCarouselById(slideId!)
        if (isCancelled) return
        setFormValues({
          titre: slide.titre,
          texte: slide.texte ?? "",
          lien_redirection: slide.lien_redirection ?? "",
          actif: slide.actif,
          image_url: slide.image_url,
        })
        setCreatedSlide(slide)
      } catch (error) {
        if (isCancelled) return
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de charger ce slide."
        setErrorMessage(message)
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    loadSlide()

    return () => {
      isCancelled = true
    }
  }, [mode, slideId])

  function validateForm(): string | null {
    const titre = formValues.titre.trim()
    if (!titre) return "Le titre est requis."
    if (titre.length > ADMIN_CAROUSEL_TITLE_MAX_LENGTH) {
      return `Le titre ne peut pas dépasser ${ADMIN_CAROUSEL_TITLE_MAX_LENGTH} caractères.`
    }
    const lien = (formValues.lien_redirection ?? "").trim()
    if (lien && !isInternalRedirectUrl(lien)) {
      return "Le lien de redirection doit être interne (commencer par /)."
    }
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    const payload: AdminCarouselWritePayload = {
      titre: formValues.titre.trim(),
      texte: formValues.texte?.trim() || null,
      lien_redirection: formValues.lien_redirection?.trim() || null,
      actif: formValues.actif,
      image_url: formValues.image_url,
    }

    try {
      if (mode === "create") {
        const slide = await createAdminCarousel(payload)
        setCreatedSlide(slide)
        setNoticeMessage(
          "Slide créé. Vous pouvez maintenant uploader les images.",
        )
        router.replace(`/admin/carousel/${slide.id_slide}/edition`)
      } else if (slideId) {
        const slide = await updateAdminCarousel(slideId, payload)
        setCreatedSlide(slide)
        setNoticeMessage("Slide mis à jour.")
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le slide."
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    variant: "desktop" | "mobile",
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    const targetSlideId = createdSlide?.id_slide ?? slideId
    if (!targetSlideId) {
      setErrorMessage(
        "Enregistrez d'abord le slide avant d'uploader une image.",
      )
      return
    }

    if (variant === "desktop") setIsUploadingDesktop(true)
    else setIsUploadingMobile(true)
    setErrorMessage(null)

    try {
      const url = await uploadAdminCarouselImage(targetSlideId, file, variant)
      if (variant === "desktop") {
        setFormValues((current) => ({ ...current, image_url: url }))
      }
      setNoticeMessage(
        `Image ${variant === "desktop" ? "desktop" : "mobile"} uploadée.`,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'uploader l'image."
      setErrorMessage(message)
    } finally {
      if (variant === "desktop") setIsUploadingDesktop(false)
      else setIsUploadingMobile(false)
      event.target.value = ""
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>
  }

  const targetSlideId = createdSlide?.id_slide ?? slideId

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/carousel")}>
        <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
        Retour à la liste
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Nouveau slide" : "Éditer le slide"}
          </CardTitle>
          <CardDescription>
            Configurez le contenu et les images du slide carrousel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-md bg-brand-alert/10 p-3 text-sm text-brand-alert"
            >
              <AlertCircle className="size-4" aria-hidden="true" />
              {errorMessage}
            </div>
          )}
          {noticeMessage && (
            <div
              role="status"
              className="mb-4 rounded-md bg-brand-success/10 p-3 text-sm text-brand-success"
            >
              {noticeMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="carousel-titre"
                className="mb-1 block text-sm font-medium"
              >
                Titre <span className="text-brand-alert">*</span>
              </label>
              <input
                id="carousel-titre"
                type="text"
                value={formValues.titre}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    titre: event.target.value,
                  }))
                }
                maxLength={ADMIN_CAROUSEL_TITLE_MAX_LENGTH}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formValues.titre.length} / {ADMIN_CAROUSEL_TITLE_MAX_LENGTH}{" "}
                caractères
              </p>
            </div>

            <div>
              <label
                htmlFor="carousel-texte"
                className="mb-1 block text-sm font-medium"
              >
                Texte
              </label>
              <textarea
                id="carousel-texte"
                value={formValues.texte ?? ""}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    texte: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="carousel-lien"
                className="mb-1 block text-sm font-medium"
              >
                Lien de redirection
              </label>
              <input
                id="carousel-lien"
                type="text"
                value={formValues.lien_redirection ?? ""}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    lien_redirection: event.target.value,
                  }))
                }
                placeholder="/catalogue/audio-professionnel"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Doit être un lien interne commençant par /
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="carousel-actif"
                type="checkbox"
                checked={formValues.actif}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    actif: event.target.checked,
                  }))
                }
              />
              <label htmlFor="carousel-actif" className="text-sm font-medium">
                Slide actif
              </label>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 size-4" aria-hidden="true" />
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>

          {targetSlideId && (
            <div className="mt-8 space-y-4 border-t pt-6">
              <div>
                <h3 className="mb-2 text-base font-semibold">Image desktop</h3>
                {formValues.image_url && (
                  <div className="mb-3">
                    <Image
                      src={formValues.image_url}
                      alt="Aperçu image desktop"
                      width={320}
                      height={180}
                      className="rounded border object-cover"
                    />
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
                  <ImagePlus className="size-4" aria-hidden="true" />
                  {isUploadingDesktop
                    ? "Upload en cours..."
                    : "Uploader image desktop"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => handleImageUpload(event, "desktop")}
                    className="sr-only"
                    disabled={isUploadingDesktop}
                  />
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG ou WebP, max 5 Mo.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold">Image mobile</h3>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
                  <ImagePlus className="size-4" aria-hidden="true" />
                  {isUploadingMobile
                    ? "Upload en cours..."
                    : "Uploader image mobile"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => handleImageUpload(event, "mobile")}
                    className="sr-only"
                    disabled={isUploadingMobile}
                  />
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Optionnel. Si non fournie, l&apos;image desktop est utilisée.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
