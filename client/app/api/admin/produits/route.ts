import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  normalizeString,
  parseFiniteNumber,
  slugify,
  toOptionalString,
} from "@/lib/admin/common"

type ProductStatus = "publie" | "brouillon"

type ProductCreatePayload = {
  nom?: unknown
  description?: unknown
  prix_ttc?: unknown
  quantite_stock?: unknown
  statut?: unknown
  slug?: unknown
  categoryIds?: unknown
}

type ProductRow = {
  id_produit: string
  nom: string
  description: string | null
  prix_ttc: number
  quantite_stock: number
  statut: ProductStatus
  slug: string
}

type ProductCategoryLink = {
  id_produit: string
  id_categorie: string
}

type CategoryRow = {
  id_categorie: string
  nom: string
}

function parseStatus(value: unknown): ProductStatus {
  return value === "publie" ? "publie" : "brouillon"
}

function parseCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => normalizeString(item)).filter(Boolean)
}

function buildQueryFilters(searchParams: URLSearchParams): {
  search: string
  status: string
  categoryId: string
} {
  return {
    search: normalizeString(searchParams.get("search")),
    status: normalizeString(searchParams.get("status")),
    categoryId: normalizeString(searchParams.get("categoryId")),
  }
}

async function getFilteredProductIdsByCategory(
  categoryId: string,
): Promise<Set<string>> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("produit_categorie")
    .select("id_produit")
    .eq("id_categorie", categoryId)

  if (error || !data) {
    return new Set()
  }

  return new Set(
    (data as Array<{ id_produit: string }>).map((row) => row.id_produit),
  )
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const filters = buildQueryFilters(request.nextUrl.searchParams)
    const supabaseAdmin = createAdminClient()

    let query = supabaseAdmin
      .from("produit")
      .select(
        "id_produit, nom, description, prix_ttc, quantite_stock, statut, slug",
      )
      .order("nom", { ascending: true })
      .limit(250)

    if (filters.status === "publie" || filters.status === "brouillon") {
      query = query.eq("statut", filters.status)
    }

    if (filters.search) {
      query = query.or(
        `nom.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`,
      )
    }

    const { data, error } = await query

    if (error) {
      console.error("Erreur chargement produits admin", { error })

      return NextResponse.json(
        {
          error: "Erreur lors du chargement des produits.",
          code: "admin_products_read_failed",
        },
        { status: 500 },
      )
    }

    const rawProducts = (data as ProductRow[] | null) ?? []

    let filteredProducts = rawProducts

    if (filters.categoryId) {
      const productIds = await getFilteredProductIdsByCategory(
        filters.categoryId,
      )
      filteredProducts = rawProducts.filter((product) =>
        productIds.has(product.id_produit),
      )
    }

    const productIds = filteredProducts.map((product) => product.id_produit)

    const [categoryLinksResult, categoriesResult] = await Promise.all([
      productIds.length > 0
        ? supabaseAdmin
            .from("produit_categorie")
            .select("id_produit, id_categorie")
            .in("id_produit", productIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from("categorie")
        .select("id_categorie, nom")
        .order("nom", { ascending: true }),
    ])

    const categoryLinks =
      (categoryLinksResult.data as ProductCategoryLink[] | null) ?? []

    const categories = (categoriesResult.data as CategoryRow[] | null) ?? []

    const categoryById = new Map(
      categories.map((category) => [category.id_categorie, category]),
    )

    const categoryIdsByProductId = new Map<string, string[]>()

    categoryLinks.forEach((link) => {
      const currentCategoryIds =
        categoryIdsByProductId.get(link.id_produit) ?? []
      currentCategoryIds.push(link.id_categorie)
      categoryIdsByProductId.set(link.id_produit, currentCategoryIds)
    })

    const products = filteredProducts.map((product) => {
      const productCategoryIds =
        categoryIdsByProductId.get(product.id_produit) ?? []

      return {
        ...product,
        categories: productCategoryIds
          .map((categoryId) => categoryById.get(categoryId))
          .filter((category): category is CategoryRow => Boolean(category)),
      }
    })

    return NextResponse.json({
      products,
      categories,
    })
  } catch (error) {
    console.error("Erreur inattendue produits admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const body = (await request
      .json()
      .catch(() => null)) as ProductCreatePayload | null

    const name = normalizeString(body?.nom)
    const description = toOptionalString(body?.description)
    const priceTtc = parseFiniteNumber(body?.prix_ttc)
    const stockQuantity = parseFiniteNumber(body?.quantite_stock)
    const status = parseStatus(body?.statut)
    const customSlug = normalizeString(body?.slug)
    const categoryIds = parseCategoryIds(body?.categoryIds)

    if (!name) {
      return NextResponse.json(
        { error: "Le nom produit est obligatoire.", code: "name_required" },
        { status: 400 },
      )
    }

    if (priceTtc === null || priceTtc < 0) {
      return NextResponse.json(
        {
          error: "Le prix TTC doit être un nombre positif.",
          code: "price_invalid",
        },
        { status: 400 },
      )
    }

    if (stockQuantity === null || stockQuantity < 0) {
      return NextResponse.json(
        {
          error: "Le stock doit être un entier positif.",
          code: "stock_invalid",
        },
        { status: 400 },
      )
    }

    const slug = customSlug || slugify(name)

    if (!slug) {
      return NextResponse.json(
        {
          error: "Impossible de générer un slug valide.",
          code: "slug_invalid",
        },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()
    const vatRate = 0.2
    const priceHt = Math.round((priceTtc / (1 + vatRate)) * 100) / 100

    const { data, error } = await supabaseAdmin
      .from("produit")
      .insert({
        nom: name,
        description,
        prix_ttc: Math.round(priceTtc * 100) / 100,
        prix_ht: priceHt,
        tva: "20",
        quantite_stock: Math.round(stockQuantity),
        statut: status,
        slug,
        priorite: 0,
        est_top_produit: false,
      } as never)
      .select(
        "id_produit, nom, description, prix_ttc, quantite_stock, statut, slug",
      )
      .single()

    if (error || !data) {
      console.error("Erreur creation produit admin", { error })

      return NextResponse.json(
        {
          error: "Erreur lors de la création du produit.",
          code: "admin_product_create_failed",
        },
        { status: 500 },
      )
    }

    const createdProduct = data as ProductRow

    if (categoryIds.length > 0) {
      const linkRows = categoryIds.map((categoryId) => ({
        id_produit: createdProduct.id_produit,
        id_categorie: categoryId,
      }))

      const { error: linkError } = await supabaseAdmin
        .from("produit_categorie")
        .insert(linkRows as never)

      if (linkError) {
        console.error("Erreur liaison categories produit", { linkError })
      }
    }

    return NextResponse.json(
      {
        product: createdProduct,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur inattendue creation produit admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
