export type AdminCarouselStatusFilter = "all" | "actif" | "inactif"

export type AdminCarouselSortBy = "titre" | "ordre" | "actif"

export type AdminCarouselSortDirection = "asc" | "desc"

export type AdminCarousel = {
  id_slide: string
  titre: string
  texte: string | null
  lien_redirection: string | null
  ordre: number
  actif: boolean
  image_url: string | null
}

export type AdminCarouselsFilters = {
  search: string
  status: AdminCarouselStatusFilter
  sortBy: AdminCarouselSortBy
  sortDirection: AdminCarouselSortDirection
}

export type AdminCarouselWritePayload = {
  titre: string
  texte: string | null
  lien_redirection: string | null
  actif: boolean
  image_url: string | null
}

export type AdminCarouselUploadVariant = "desktop" | "mobile"
