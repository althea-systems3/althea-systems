"use client"

import { AlertCircle, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

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
  deleteAdminCarousel,
  fetchAdminCarouselById,
} from "./adminCarouselsApi"
import type { AdminCarousel } from "./adminCarouselsTypes"
import { mapCarouselStatusUi } from "./adminCarouselsUtils"

type AdminCarouselDetailPageProps = {
  slideId: string
}

export function AdminCarouselDetailPage({
  slideId,
}: AdminCarouselDetailPageProps) {
  const router = useRouter()
  const [slide, setSlide] = useState<AdminCarousel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadSlide() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const data = await fetchAdminCarouselById(slideId)
        if (!isCancelled) setSlide(data)
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
  }, [slideId])

  async function handleDelete() {
    if (!slide) return

    const confirmed = await confirmCriticalAction({
      title: "Supprimer ce slide ?",
      message: `Le slide « ${slide.titre} » sera définitivement supprimé.`,
      confirmLabel: "Supprimer",
    })

    if (!confirmed) return

    setIsDeleting(true)
    setErrorMessage(null)

    try {
      await deleteAdminCarousel(slide.id_slide)
      router.push("/admin/carousel")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le slide."
      setErrorMessage(message)
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>
  }

  if (!slide) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/admin/carousel")}>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Retour
        </Button>
        <p className="text-sm text-brand-alert">
          {errorMessage ?? "Slide introuvable."}
        </p>
      </div>
    )
  }

  const statusUi = mapCarouselStatusUi(slide.actif)

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/carousel")}>
        <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
        Retour à la liste
      </Button>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md bg-brand-alert/10 p-3 text-sm text-brand-alert"
        >
          <AlertCircle className="size-4" aria-hidden="true" />
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{slide.titre}</CardTitle>
            <CardDescription>Détail du slide</CardDescription>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/carousel/${slide.id_slide}/edition`}>
              <Button variant="outline">
                <Pencil className="mr-2 size-4" aria-hidden="true" />
                Éditer
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-brand-alert hover:text-brand-alert"
            >
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {slide.image_url && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Image desktop</h3>
              <Image
                src={slide.image_url}
                alt={`Image slide ${slide.titre}`}
                width={480}
                height={270}
                className="rounded border object-cover"
              />
            </div>
          )}

          <div>
            <h3 className="mb-1 text-sm font-semibold">Texte</h3>
            <p className="text-sm text-muted-foreground">
              {slide.texte ?? "Aucun texte"}
            </p>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold">Lien de redirection</h3>
            <p className="text-sm text-muted-foreground">
              {slide.lien_redirection ?? "Aucun"}
            </p>
          </div>

          <div className="flex gap-4">
            <div>
              <h3 className="mb-1 text-sm font-semibold">Ordre</h3>
              <p className="font-mono text-sm">{slide.ordre}</p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold">Statut</h3>
              <Badge className={statusUi.className}>{statusUi.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
