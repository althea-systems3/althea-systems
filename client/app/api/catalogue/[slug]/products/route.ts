import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_IMAGES_PRODUITS } from "@/lib/top-produits/constants"
import type { Categorie, Produit, ProduitCategorie } from "@/lib/supabase/types"

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 24
const FIRESTORE_IN_QUERY_LIMIT = 30

type CatalogueProductPayload = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  price: number | null
  isAvailable: boolean
}

type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type CatalogueProduitRow = Produit

function parsePaginationParams(searchParams: URLSearchParams): {
  page: number
  pageSize: number
} {
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10)
  const rawPageSize = parseInt(
    searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
    10,
  )

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  return { page, pageSize }
}

function getSortTier(product: CatalogueProduitRow): number {
  const isAvailable = product.quantite_stock > 0
  const isPriority = product.priorite > 0

  if (isPriority && isAvailable) return 0
  if (isAvailable) return 1
  return 2
}

function sortProducts(products: CatalogueProduitRow[]): CatalogueProduitRow[] {
  return [...products].sort((a, b) => {
    const tierA = getSortTier(a)
    const tierB = getSortTier(b)

    if (tierA !== tierB) return tierA - tierB

    return b.priorite - a.priorite
  })
}

type FirestoreImageDoc = {
  produit_id: string
  images: { url: string; est_principale: boolean }[]
}

function extractMainImageUrl(imageDoc: FirestoreImageDoc): string | null {
  const mainImage = imageDoc.images?.find((img) => img.est_principale)
  return mainImage?.url ?? imageDoc.images?.[0]?.url ?? null
}

function splitIntoBatches(items: string[]): string[][] {
  const batches: string[][] = []
  for (let i = 0; i < items.length; i += FIRESTORE_IN_QUERY_LIMIT) {
    batches.push(items.slice(i, i + FIRESTORE_IN_QUERY_LIMIT))
  }
  return batches
}

async function fetchProductImages(
  productIds: string[],
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()

  if (productIds.length === 0) {
    return imageMap
  }

  try {
    const firestore = getFirestoreClient()

    for (const batch of splitIntoBatches(productIds)) {
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
    console.error("Erreur chargement images Firestore produits", { error })
  }

  return imageMap
}

function mapToPayload(
  product: CatalogueProduitRow,
  imageUrl: string | null,
): CatalogueProductPayload {
  const resolvedImageUrl = imageUrl ?? null

  return {
    id: product.id_produit,
    name: product.nom,
    slug: product.slug,
    imageUrl: resolvedImageUrl,
    price: product.prix_ttc ?? null,
    isAvailable: product.quantite_stock > 0,
  }
}

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const { page, pageSize } = parsePaginationParams(searchParams)

  if (!hasRequiredConfig()) {
    return NextResponse.json(
      {
        products: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      },
      { status: 503 },
    )
  }

  try {
    const supabaseAdmin = createAdminClient()

    const { data: rawCategory, error: categoryError } = await supabaseAdmin
      .from("categorie")
      .select("id_categorie")
      .eq("slug", slug)
      .eq("statut", "active")
      .single()

    if (categoryError || !rawCategory) {
      return NextResponse.json(
        {
          products: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
          notFound: true,
        },
        { status: 404 },
      )
    }

    const category = rawCategory as Pick<Categorie, "id_categorie">

    const { data: rawLinks, error: linksError } = await supabaseAdmin
      .from("produit_categorie")
      .select("id_produit")
      .eq("id_categorie", category.id_categorie)

    if (linksError) {
      console.error("Erreur chargement liens produit-catégorie", {
        slug,
        error: linksError,
      })
      return NextResponse.json(
        {
          products: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        },
        { status: 500 },
      )
    }

    const productLinks = (rawLinks ?? []) as Pick<
      ProduitCategorie,
      "id_produit"
    >[]

    if (productLinks.length === 0) {
      return NextResponse.json({
        products: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      })
    }

    const productIds = productLinks.map((link) => link.id_produit)

    const { data: rawProducts, error: productsError } = await supabaseAdmin
      .from("produit")
      .select(
        "id_produit, nom, slug, prix_ttc, quantite_stock, priorite, statut",
      )
      .in("id_produit", productIds)
      .eq("statut", "publie")

    if (productsError) {
      console.error("Erreur chargement produits catalogue", {
        slug,
        error: productsError,
      })
      return NextResponse.json(
        {
          products: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        },
        { status: 500 },
      )
    }

    const products = (rawProducts ?? []) as CatalogueProduitRow[]
    const sorted = sortProducts(products)

    const total = sorted.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    const safePage = Math.min(page, Math.max(totalPages, 1))
    const offset = (safePage - 1) * pageSize
    const paginated = sorted.slice(offset, offset + pageSize)

    const paginatedIds = paginated.map((p) => p.id_produit)
    const imageMap = await fetchProductImages(paginatedIds)

    const pagination: PaginationMeta = {
      page: safePage,
      pageSize,
      total,
      totalPages,
    }

    return NextResponse.json({
      products: paginated.map((p) =>
        mapToPayload(p, imageMap.get(p.id_produit) ?? null),
      ),
      pagination,
    })
  } catch (error) {
    console.error("Erreur inattendue endpoint produits catalogue", {
      slug,
      error,
    })
    return NextResponse.json(
      {
        products: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      },
      { status: 500 },
    )
  }
}
