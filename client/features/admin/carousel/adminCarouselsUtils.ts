import type {
  AdminCarousel,
  AdminCarouselSortBy,
  AdminCarouselSortDirection,
  AdminCarouselsFilters,
} from "./adminCarouselsTypes"

export const ADMIN_CAROUSEL_MAX_SLIDES = 3

export const ADMIN_CAROUSEL_TITLE_MAX_LENGTH = 100

export const ADMIN_CAROUSEL_SORT_LABELS: Record<AdminCarouselSortBy, string> = {
  titre: "Titre",
  ordre: "Ordre",
  actif: "Statut",
}

export const DEFAULT_ADMIN_CAROUSELS_FILTERS: AdminCarouselsFilters = {
  search: "",
  status: "all",
  sortBy: "ordre",
  sortDirection: "asc",
}

export function createDefaultAdminCarouselsFilters(): AdminCarouselsFilters {
  return { ...DEFAULT_ADMIN_CAROUSELS_FILTERS }
}

export function buildAdminCarouselsQueryString(
  filters: AdminCarouselsFilters,
): string {
  const searchParams = new URLSearchParams()

  if (filters.search.trim()) {
    searchParams.set("search", filters.search.trim())
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status)
  }

  searchParams.set("sortBy", filters.sortBy)
  searchParams.set("sortDirection", filters.sortDirection)

  return searchParams.toString()
}

export function mapCarouselStatusUi(actif: boolean): {
  label: string
  className: string
} {
  return actif
    ? { label: "Actif", className: "bg-brand-success text-white" }
    : { label: "Inactif", className: "bg-brand-alert text-white" }
}

export function getNextSortDirection(
  currentSortBy: AdminCarouselSortBy,
  currentSortDirection: AdminCarouselSortDirection,
  nextSortBy: AdminCarouselSortBy,
): AdminCarouselSortDirection {
  if (currentSortBy !== nextSortBy) {
    return "asc"
  }

  return currentSortDirection === "asc" ? "desc" : "asc"
}

export function filterAndSortCarousels(
  slides: AdminCarousel[],
  filters: AdminCarouselsFilters,
): AdminCarousel[] {
  const search = filters.search.trim().toLowerCase()

  let filtered = slides.filter((slide) => {
    if (filters.status === "actif" && !slide.actif) return false
    if (filters.status === "inactif" && slide.actif) return false

    if (search) {
      const titreMatch = slide.titre.toLowerCase().includes(search)
      const texteMatch = (slide.texte ?? "").toLowerCase().includes(search)
      if (!titreMatch && !texteMatch) return false
    }

    return true
  })

  filtered = [...filtered].sort((a, b) => {
    let comparison = 0

    if (filters.sortBy === "titre") {
      comparison = a.titre.localeCompare(b.titre, "fr")
    } else if (filters.sortBy === "ordre") {
      comparison = a.ordre - b.ordre
    } else {
      comparison = Number(a.actif) - Number(b.actif)
    }

    return filters.sortDirection === "asc" ? comparison : -comparison
  })

  return filtered
}

export function reorderCarouselsByDragAndDrop(
  slides: AdminCarousel[],
  sourceId: string,
  targetId: string,
): AdminCarousel[] {
  if (sourceId === targetId) return slides

  const sourceIndex = slides.findIndex((slide) => slide.id_slide === sourceId)
  const targetIndex = slides.findIndex((slide) => slide.id_slide === targetId)

  if (sourceIndex < 0 || targetIndex < 0) return slides

  const next = [...slides]
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, moved)

  return next.map((slide, index) => ({ ...slide, ordre: index + 1 }))
}

export function isInternalRedirectUrl(value: string): boolean {
  if (!value) return true
  return value.startsWith("/")
}
