import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_IMAGES_PRODUITS } from "@/lib/top-produits/constants"
import {
  computeProductRelevanceScore,
  computeTextRelevanceScore,
} from "@/lib/search/scoring"
import {
  DEFAULT_SEARCH_PAGE,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
} from "@/lib/search/constants"
import type { Produit, ProduitCategorie } from "@/lib/supabase/types"

const FIRESTORE_IN_QUERY_LIMIT = 30

type SearchProductPayload = {
  id: string
  name: string
  slug: string
  description: string | null
  priceTtc: number | null
  isAvailable: boolean
  imageUrl: string | null
  relevanceScore: number
}

type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type FirestoreImageDoc = {
  produit_id: string
  images: { url: string; est_principale: boolean }[]
}

type SearchSortBy = "relevance" | "price" | "newness" | "availability"
type SearchSortOrder = "asc" | "desc"

type SearchParams = {
  query: string | null
  titleQuery: string | null
  descriptionQuery: string | null
  characteristicsQuery: string | null
  priceMin: number | null
  priceMax: number | null
  categoryIds: string[]
  isAvailableOnly: boolean
  sortBy: SearchSortBy
  sortOrder: SearchSortOrder
  page: number
  limit: number
}

type FetchProductImagesResult = {
  imageMap: Map<string, string>
  hasMissingSecondaryData: boolean
}

// --- Parsing ---

function parseSortBy(searchSortBy: string | null): SearchSortBy | null {
  if (searchSortBy === "price") {
    return "price"
  }

  if (searchSortBy === "newness" || searchSortBy === "newest") {
    return "newness"
  }

  if (searchSortBy === "availability") {
    return "availability"
  }

  if (searchSortBy === "relevance") {
    return "relevance"
  }

  return null
}

function parseSortOrder(
  searchSortOrder: string | null,
): SearchSortOrder | null {
  if (searchSortOrder === "asc") {
    return "asc"
  }

  if (searchSortOrder === "desc") {
    return "desc"
  }

  return null
}

function parseLegacySort(legacySort: string | null): {
  sortBy: SearchSortBy
  sortOrder: SearchSortOrder
} {
  switch (legacySort) {
    case "price_asc":
      return { sortBy: "price", sortOrder: "asc" }

    case "price_desc":
      return { sortBy: "price", sortOrder: "desc" }

    case "availability":
      return { sortBy: "availability", sortOrder: "desc" }

    case "relevance":
    default:
      return { sortBy: "relevance", sortOrder: "desc" }
  }
}

function parseSearchParams(searchParams: URLSearchParams): SearchParams {
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10)
  const rawLimit = parseInt(
    searchParams.get("limit") ?? String(DEFAULT_SEARCH_LIMIT),
    10,
  )

  const page =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_SEARCH_PAGE

  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_SEARCH_LIMIT)
      : DEFAULT_SEARCH_LIMIT

  const rawPriceMin = searchParams.get("price_min")
  const rawPriceMax = searchParams.get("price_max")

  const priceMin = rawPriceMin !== null ? parseFloat(rawPriceMin) : null

  const priceMax = rawPriceMax !== null ? parseFloat(rawPriceMax) : null

  const rawCategories = searchParams.get("categories") ?? ""
  const categoryIds = rawCategories
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)

  const rawSortBy = parseSortBy(searchParams.get("sort_by"))
  const rawSortOrder = parseSortOrder(searchParams.get("sort_order"))
  const legacySort = parseLegacySort(searchParams.get("sort"))

  const sortBy = rawSortBy ?? legacySort.sortBy
  const sortOrder = rawSortOrder ?? legacySort.sortOrder

  return {
    query: searchParams.get("q")?.trim() || null,
    titleQuery: searchParams.get("title")?.trim() || null,
    descriptionQuery: searchParams.get("description")?.trim() || null,
    characteristicsQuery:
      searchParams.get("characteristics")?.trim() ||
      searchParams.get("tech")?.trim() ||
      null,
    priceMin: priceMin !== null && Number.isFinite(priceMin) ? priceMin : null,
    priceMax: priceMax !== null && Number.isFinite(priceMax) ? priceMax : null,
    categoryIds,
    isAvailableOnly: searchParams.get("available_only") === "true",
    sortBy,
    sortOrder,
    page,
    limit,
  }
}

// --- Images Firestore ---

function extractMainImageUrl(imageDoc: FirestoreImageDoc): string | null {
  const mainImage = imageDoc.images?.find((img) => img.est_principale)
  return mainImage?.url ?? imageDoc.images?.[0]?.url ?? null
}

async function fetchProductImages(
  productIds: string[],
): Promise<FetchProductImagesResult> {
  const imageMap = new Map<string, string>()
  let hasMissingSecondaryData = false

  if (productIds.length === 0) {
    return {
      imageMap,
      hasMissingSecondaryData,
    }
  }

  try {
    const firestore = getFirestoreClient()

    for (let i = 0; i < productIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
      const batch = productIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT)

      const snapshot = await firestore
        .collection(FIRESTORE_IMAGES_PRODUITS)
        .where("produit_id", "in", batch)
        .get()

      snapshot.docs.forEach((doc) => {
        const imageDoc = doc.data() as FirestoreImageDoc
        const imageUrl = extractMainImageUrl(imageDoc)

        if (imageUrl) {
          imageMap.set(imageDoc.produit_id, imageUrl)
        }
      })
    }
  } catch (error) {
    console.error("Erreur chargement images Firestore recherche", { error })
    hasMissingSecondaryData = true
  }

  return {
    imageMap,
    hasMissingSecondaryData,
  }
}

// --- Filtrage catégorie ---

async function fetchProductIdsByCategories(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  categoryIds: string[],
): Promise<Set<string>> {
  const { data: rawLinks, error } = await supabaseAdmin
    .from("produit_categorie")
    .select("id_produit")
    .in("id_categorie", categoryIds)

  if (error || !rawLinks) {
    return new Set()
  }

  const links = rawLinks as Pick<ProduitCategorie, "id_produit">[]
  return new Set(links.map((link) => link.id_produit))
}

// --- Recherche JSONB ---

function matchesJsonbSearch(
  characteristics: Record<string, unknown> | null,
  searchTerm: string,
): boolean {
  if (!characteristics) {
    return false
  }

  const serialized = JSON.stringify(characteristics).toLowerCase()
  return serialized.includes(searchTerm.toLowerCase())
}

// --- Tri ---

type ScoredProduct = {
  product: Produit
  relevanceScore: number
}

function sortResults(
  scoredProducts: ScoredProduct[],
  sortBy: SearchSortBy,
  sortOrder: SearchSortOrder,
): ScoredProduct[] {
  const sorted = [...scoredProducts]
  const direction = sortOrder === "asc" ? 1 : -1

  const compareByRelevance = (itemA: ScoredProduct, itemB: ScoredProduct) => {
    if (itemB.relevanceScore !== itemA.relevanceScore) {
      const relevanceDelta = itemB.relevanceScore - itemA.relevanceScore
      return sortOrder === "asc" ? -relevanceDelta : relevanceDelta
    }

    const stockDelta =
      itemB.product.quantite_stock - itemA.product.quantite_stock

    if (stockDelta !== 0) {
      return stockDelta
    }

    return itemB.product.priorite - itemA.product.priorite
  }

  switch (sortBy) {
    case "price":
      sorted.sort((itemA, itemB) => {
        const priceDelta =
          (itemA.product.prix_ttc - itemB.product.prix_ttc) * direction

        if (priceDelta !== 0) {
          return priceDelta
        }

        return compareByRelevance(itemA, itemB)
      })
      break

    case "newness":
      // NOTE: Le schema produit ne contient pas de date de publication.
      // On utilise priorite comme proxy de fraicheur de mise en avant.
      sorted.sort((itemA, itemB) => {
        const priorityDelta =
          (itemA.product.priorite - itemB.product.priorite) * direction

        if (priorityDelta !== 0) {
          return priorityDelta
        }

        return compareByRelevance(itemA, itemB)
      })
      break

    case "availability":
      sorted.sort((itemA, itemB) => {
        const stockDelta =
          (itemA.product.quantite_stock - itemB.product.quantite_stock) *
          direction

        if (stockDelta !== 0) {
          return stockDelta
        }

        return compareByRelevance(itemA, itemB)
      })
      break

    case "relevance":
    default:
      sorted.sort(compareByRelevance)
      break
  }

  return sorted
}

function scoreAndFilterProducts(
  products: Produit[],
  params: SearchParams,
): ScoredProduct[] {
  const hasTextCriteria = Boolean(
    params.query ||
    params.titleQuery ||
    params.descriptionQuery ||
    params.characteristicsQuery,
  )

  if (!hasTextCriteria) {
    return products.map((product) => ({
      product,
      relevanceScore: 0,
    }))
  }

  return products.flatMap((product) => {
    let relevanceScore = 0

    if (params.query) {
      const textScore = computeProductRelevanceScore(product, params.query)
      const hasJsonbMatch = matchesJsonbSearch(
        product.caracteristique_tech,
        params.query,
      )

      const queryScore = textScore > 0 ? textScore : hasJsonbMatch ? 50 : 0

      if (queryScore <= 0) {
        return []
      }

      relevanceScore += queryScore
    }

    if (params.titleQuery) {
      const titleScore = computeTextRelevanceScore(
        product.nom,
        params.titleQuery,
      )

      if (titleScore <= 0) {
        return []
      }

      relevanceScore += titleScore * 2
    }

    if (params.descriptionQuery) {
      const descriptionScore = computeTextRelevanceScore(
        product.description,
        params.descriptionQuery,
      )

      if (descriptionScore <= 0) {
        return []
      }

      relevanceScore += descriptionScore
    }

    if (params.characteristicsQuery) {
      const hasCharacteristicsMatch = matchesJsonbSearch(
        product.caracteristique_tech,
        params.characteristicsQuery,
      )

      if (!hasCharacteristicsMatch) {
        return []
      }

      relevanceScore += 50
    }

    return [{ product, relevanceScore }]
  })
}

// --- Mapping ---

function mapToSearchPayload(
  product: Produit,
  relevanceScore: number,
  imageUrl: string | null,
): SearchProductPayload {
  return {
    id: product.id_produit,
    name: product.nom,
    slug: product.slug,
    description: product.description,
    priceTtc: product.prix_ttc ?? null,
    isAvailable: product.quantite_stock > 0,
    imageUrl,
    relevanceScore,
  }
}

// --- Config ---

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
}

// --- Handler ---

export async function GET(request: Request) {
  if (!hasRequiredConfig()) {
    return NextResponse.json(
      { products: [], pagination: null, isPartialData: false },
      { status: 503 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const params = parseSearchParams(searchParams)

    const supabaseAdmin = createAdminClient()

    // NOTE: Récupère tous les produits publiés avec filtres SQL
    let supabaseQuery = supabaseAdmin
      .from("produit")
      .select(
        "id_produit, nom, description, caracteristique_tech, prix_ht, prix_ttc, quantite_stock, statut, slug, priorite, est_top_produit",
      )
      .eq("statut", "publie")

    if (params.priceMin !== null) {
      supabaseQuery = supabaseQuery.gte("prix_ttc", params.priceMin)
    }

    if (params.priceMax !== null) {
      supabaseQuery = supabaseQuery.lte("prix_ttc", params.priceMax)
    }

    if (params.isAvailableOnly) {
      supabaseQuery = supabaseQuery.gt("quantite_stock", 0)
    }

    const { data: rawProducts, error } = await supabaseQuery

    if (error) {
      console.error("Erreur recherche Supabase", { error })
      return NextResponse.json(
        { products: [], pagination: null, isPartialData: false },
        { status: 500 },
      )
    }

    let products = (rawProducts ?? []) as Produit[]

    // NOTE: Filtre par catégories côté JS après jointure
    if (params.categoryIds.length > 0) {
      const allowedProductIds = await fetchProductIdsByCategories(
        supabaseAdmin,
        params.categoryIds,
      )

      products = products.filter((product) =>
        allowedProductIds.has(product.id_produit),
      )
    }

    // NOTE: Filtrage texte et scoring multi-criteres
    const scoredProducts = scoreAndFilterProducts(products, params)

    // NOTE: Tri selon le paramètre demandé
    const sorted = sortResults(scoredProducts, params.sortBy, params.sortOrder)

    // NOTE: Pagination
    const total = sorted.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)
    const safePage = Math.min(params.page, Math.max(totalPages, 1))
    const offset = (safePage - 1) * params.limit
    const paginated = sorted.slice(offset, offset + params.limit)

    // NOTE: Images Firestore pour les produits paginés uniquement
    const paginatedIds = paginated.map((item) => item.product.id_produit)
    const { imageMap, hasMissingSecondaryData } =
      await fetchProductImages(paginatedIds)
    const hasPaginatedImageGap = paginatedIds.some((id) => !imageMap.has(id))

    const pagination: PaginationMeta = {
      page: safePage,
      limit: params.limit,
      total,
      totalPages,
    }

    const payload = paginated.map((item) =>
      mapToSearchPayload(
        item.product,
        item.relevanceScore,
        imageMap.get(item.product.id_produit) ?? null,
      ),
    )

    return NextResponse.json({
      products: payload,
      pagination,
      isPartialData: hasMissingSecondaryData || hasPaginatedImageGap,
    })
  } catch (error) {
    console.error("Erreur inattendue endpoint recherche", { error })
    return NextResponse.json(
      { products: [], pagination: null, isPartialData: false },
      { status: 500 },
    )
  }
}
