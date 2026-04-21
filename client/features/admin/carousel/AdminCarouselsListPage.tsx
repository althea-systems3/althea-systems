"use client"

import {
  ArrowDown,
  ArrowUp,
  Eye,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import { type FormEvent, useCallback, useEffect, useState } from "react"

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
  AdminListErrorAlert,
  AdminListNoticeAlert,
} from "@/features/admin/shared"
import { Link, useRouter } from "@/i18n/navigation"
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"

import {
  deleteAdminCarousel,
  fetchAdminCarousels,
  reorderAdminCarousels,
  updateAdminCarouselStatus,
} from "./adminCarouselsApi"
import type {
  AdminCarousel,
  AdminCarouselSortBy,
  AdminCarouselStatusFilter,
  AdminCarouselsFilters,
} from "./adminCarouselsTypes"
import {
  ADMIN_CAROUSEL_MAX_SLIDES,
  ADMIN_CAROUSEL_SORT_LABELS,
  createDefaultAdminCarouselsFilters,
  filterAndSortCarousels,
  getNextSortDirection,
  mapCarouselStatusUi,
} from "./adminCarouselsUtils"

function buildReorderPayload(slides: AdminCarousel[]) {
  return slides.map((slide) => ({ id: slide.id_slide, ordre: slide.ordre }))
}

function moveSlide(
  slides: AdminCarousel[],
  slideId: string,
  offset: number,
): AdminCarousel[] {
  const sorted = [...slides].sort((a, b) => a.ordre - b.ordre)
  const currentIndex = sorted.findIndex((slide) => slide.id_slide === slideId)
  if (currentIndex < 0) return slides

  const targetIndex = currentIndex + offset
  if (targetIndex < 0 || targetIndex >= sorted.length) return slides

  const next = [...sorted]
  const [moved] = next.splice(currentIndex, 1)
  next.splice(targetIndex, 0, moved)

  return next.map((slide, index) => ({ ...slide, ordre: index + 1 }))
}

export function AdminCarouselsListPage() {
  const router = useRouter()

  const [filters, setFilters] = useState<AdminCarouselsFilters>(
    createDefaultAdminCarouselsFilters(),
  )
  const [searchDraft, setSearchDraft] = useState("")
  const [slides, setSlides] = useState<AdminCarousel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReorderLoading, setIsReorderLoading] = useState(false)
  const [togglingSlideId, setTogglingSlideId] = useState<string | null>(null)
  const [deletingSlideId, setDeletingSlideId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const loadSlides = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const data = await fetchAdminCarousels()
      setSlides(data)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de charger les slides."
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSlides()
  }, [loadSlides])

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters((current) => ({ ...current, search: searchDraft }))
  }

  function handleClearSearch() {
    setSearchDraft("")
    setFilters((current) => ({ ...current, search: "" }))
  }

  function handleStatusChange(status: AdminCarouselStatusFilter) {
    setFilters((current) => ({ ...current, status }))
  }

  function handleSortChange(sortBy: AdminCarouselSortBy) {
    setFilters((current) => ({
      ...current,
      sortBy,
      sortDirection: getNextSortDirection(
        current.sortBy,
        current.sortDirection,
        sortBy,
      ),
    }))
  }

  async function handleMoveSlide(slideId: string, offset: number) {
    const next = moveSlide(slides, slideId, offset)
    if (next === slides) return

    setSlides(next)
    setIsReorderLoading(true)
    setErrorMessage(null)

    try {
      await reorderAdminCarousels(buildReorderPayload(next))
      setNoticeMessage("Ordre des slides mis à jour.")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de réorganiser les slides."
      setErrorMessage(message)
      await loadSlides()
    } finally {
      setIsReorderLoading(false)
    }
  }

  async function handleToggleStatus(slide: AdminCarousel) {
    setTogglingSlideId(slide.id_slide)
    setErrorMessage(null)

    try {
      const updated = await updateAdminCarouselStatus(
        slide.id_slide,
        !slide.actif,
      )
      setSlides((current) =>
        current.map((item) =>
          item.id_slide === updated.id_slide ? updated : item,
        ),
      )
      setNoticeMessage(
        updated.actif ? "Slide activé." : "Slide désactivé.",
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut."
      setErrorMessage(message)
    } finally {
      setTogglingSlideId(null)
    }
  }

  async function handleDelete(slide: AdminCarousel) {
    const confirmed = await confirmCriticalAction({
      title: "Supprimer ce slide ?",
      message: `Le slide « ${slide.titre} » sera définitivement supprimé.`,
      confirmLabel: "Supprimer",
    })

    if (!confirmed) return

    setDeletingSlideId(slide.id_slide)
    setErrorMessage(null)

    try {
      await deleteAdminCarousel(slide.id_slide)
      setSlides((current) =>
        current.filter((item) => item.id_slide !== slide.id_slide),
      )
      setNoticeMessage("Slide supprimé.")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le slide."
      setErrorMessage(message)
    } finally {
      setDeletingSlideId(null)
    }
  }

  const visibleSlides = filterAndSortCarousels(slides, filters)
  const canCreateSlide = slides.length < ADMIN_CAROUSEL_MAX_SLIDES
  const canReorder =
    filters.sortBy === "ordre" &&
    filters.sortDirection === "asc" &&
    !filters.search.trim() &&
    filters.status === "all"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Carrousel page d&apos;accueil</CardTitle>
            <CardDescription>
              Gestion des slides promotionnels (max{" "}
              {ADMIN_CAROUSEL_MAX_SLIDES}). Réordonnez avec les flèches.
            </CardDescription>
          </div>
          <Button
            onClick={() => router.push("/admin/carousel/nouveau")}
            disabled={!canCreateSlide}
            title={
              canCreateSlide
                ? "Créer un nouveau slide"
                : `Maximum ${ADMIN_CAROUSEL_MAX_SLIDES} slides atteint`
            }
          >
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Nouveau slide
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-wrap items-center gap-2"
          >
            <div className="relative flex-1 min-w-[240px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Rechercher un slide..."
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
                aria-label="Rechercher un slide"
              />
            </div>
            <Button type="submit" variant="secondary">
              Rechercher
            </Button>
            {filters.search && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearSearch}
              >
                Réinitialiser
              </Button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Statut :</span>
            {(["all", "actif", "inactif"] as AdminCarouselStatusFilter[]).map(
              (status) => (
                <Button
                  key={status}
                  variant={filters.status === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(status)}
                >
                  {status === "all"
                    ? "Tous"
                    : status === "actif"
                      ? "Actifs"
                      : "Inactifs"}
                </Button>
              ),
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Trier par :</span>
            {(Object.keys(ADMIN_CAROUSEL_SORT_LABELS) as AdminCarouselSortBy[]).map(
              (sortBy) => (
                <Button
                  key={sortBy}
                  variant={filters.sortBy === sortBy ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSortChange(sortBy)}
                >
                  {ADMIN_CAROUSEL_SORT_LABELS[sortBy]}
                  {filters.sortBy === sortBy &&
                    (filters.sortDirection === "asc" ? " ↑" : " ↓")}
                </Button>
              ),
            )}
          </div>

          <AdminListErrorAlert message={errorMessage} />
          <AdminListNoticeAlert message={noticeMessage} />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Chargement des slides...
            </p>
          ) : visibleSlides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun slide trouvé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-3">Image</th>
                    <th className="px-2 py-3">Titre</th>
                    <th className="px-2 py-3">Lien</th>
                    <th className="px-2 py-3">Ordre</th>
                    <th className="px-2 py-3">Statut</th>
                    <th className="px-2 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSlides.map((slide) => {
                    const statusUi = mapCarouselStatusUi(slide.actif)
                    const isToggling = togglingSlideId === slide.id_slide
                    const isDeleting = deletingSlideId === slide.id_slide
                    return (
                      <tr key={slide.id_slide} className="border-b">
                        <td className="px-2 py-3">
                          {slide.image_url ? (
                            <Image
                              src={slide.image_url}
                              alt={`Image slide ${slide.titre}`}
                              width={64}
                              height={40}
                              className="rounded object-cover"
                            />
                          ) : (
                            <div className="flex size-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                              —
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3 font-medium">{slide.titre}</td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {slide.lien_redirection ?? "—"}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">
                              {slide.ordre}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!canReorder || isReorderLoading}
                              onClick={() =>
                                handleMoveSlide(slide.id_slide, -1)
                              }
                              aria-label="Monter le slide"
                            >
                              <ArrowUp className="size-4" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!canReorder || isReorderLoading}
                              onClick={() =>
                                handleMoveSlide(slide.id_slide, 1)
                              }
                              aria-label="Descendre le slide"
                            >
                              <ArrowDown
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <Badge className={statusUi.className}>
                            {statusUi.label}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(slide)}
                              disabled={isToggling}
                              aria-label={
                                slide.actif
                                  ? "Désactiver le slide"
                                  : "Activer le slide"
                              }
                            >
                              <Power className="size-4" aria-hidden="true" />
                            </Button>
                            <Link href={`/admin/carousel/${slide.id_slide}`}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label="Voir le slide"
                              >
                                <Eye className="size-4" aria-hidden="true" />
                              </Button>
                            </Link>
                            <Link
                              href={`/admin/carousel/${slide.id_slide}/edition`}
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label="Éditer le slide"
                              >
                                <Pencil
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(slide)}
                              disabled={isDeleting}
                              aria-label="Supprimer le slide"
                              className="text-brand-alert hover:text-brand-alert"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
