import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Categorie, Produit, ProduitCategorie } from "@/lib/supabase/types"

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 24

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

function getSortTier(product: Produit): number {
  const isAvailable = product.quantite_stock > 0
  const isPriority = product.priorite > 0

  if (isPriority && isAvailable) return 0
  if (isAvailable) return 1
  return 2
}

function sortProducts(products: Produit[]): Produit[] {
  return [...products].sort((a, b) => {
    const tierA = getSortTier(a)
    const tierB = getSortTier(b)

    if (tierA !== tierB) return tierA - tierB

    return b.priorite - a.priorite
  })
}

function mapToPayload(product: Produit): CatalogueProductPayload {
  return {
    id: product.id_produit,
    name: product.nom,
    slug: product.slug,
    imageUrl: null,
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

    const products = (rawProducts ?? []) as Produit[]
    const sorted = sortProducts(products)

    const total = sorted.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    const safePage = Math.min(page, Math.max(totalPages, 1))
    const offset = (safePage - 1) * pageSize
    const paginated = sorted.slice(offset, offset + pageSize)

    const pagination: PaginationMeta = {
      page: safePage,
      pageSize,
      total,
      totalPages,
    }

    return NextResponse.json({
      products: paginated.map(mapToPayload),
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
