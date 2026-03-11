import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Produit } from "@/lib/supabase/types"

type HomeTopProductPayload = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  price: number | null
  displayOrder: number
  isAvailable: boolean
}

const FALLBACK_HOME_TOP_PRODUCTS: HomeTopProductPayload[] = [
  {
    id: "fallback-top-product-1",
    name: "Interface Audio DSP-24",
    slug: "interface-audio-dsp-24",
    imageUrl: "/carousel/pro-audio.svg",
    price: 649,
    displayOrder: 1,
    isAvailable: true,
  },
  {
    id: "fallback-top-product-2",
    name: "Switch Industriel Redondant",
    slug: "switch-industriel-redondant",
    imageUrl: "/carousel/industrial-network.svg",
    price: 899,
    displayOrder: 2,
    isAvailable: true,
  },
  {
    id: "fallback-top-product-3",
    name: "Module Support Telemetrie",
    slug: "module-support-telemetrie",
    imageUrl: "/carousel/smart-support.svg",
    price: 299,
    displayOrder: 3,
    isAvailable: false,
  },
]

function mapToHomeTopProductPayload(
  product: Produit,
  fallbackOrder: number,
): HomeTopProductPayload {
  return {
    id: product.id_produit,
    name: product.nom,
    slug: product.slug,
    imageUrl: null,
    price: Number.isFinite(Number(product.prix_ttc))
      ? Number(product.prix_ttc)
      : null,
    displayOrder: product.priorite ?? fallbackOrder,
    isAvailable: product.quantite_stock > 0,
  }
}

function createFallbackTopProductsResponse() {
  return NextResponse.json({
    products: FALLBACK_HOME_TOP_PRODUCTS,
    isFallbackData: true,
  })
}

function createTopProductsResponse(products: HomeTopProductPayload[]) {
  return NextResponse.json({
    products,
    isFallbackData: false,
  })
}

export async function GET() {
  try {
    const hasSupabaseConfiguration =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (!hasSupabaseConfiguration) {
      return createFallbackTopProductsResponse()
    }

    const supabaseAdminClient = createAdminClient()

    const { data: rawTopProducts, error } = await supabaseAdminClient
      .from("produit")
      .select(
        "id_produit, nom, slug, prix_ttc, quantite_stock, priorite, statut, est_top_produit",
      )
      .eq("est_top_produit", true)
      .eq("statut", "publie")
      .order("priorite", { ascending: true })

    if (error) {
      console.error("Failed to load top products from Supabase", {
        error,
      })
      return createFallbackTopProductsResponse()
    }

    const products = (rawTopProducts ?? []).map((product, index) => {
      return mapToHomeTopProductPayload(product as Produit, index + 1)
    })

    if (products.length === 0) {
      return createFallbackTopProductsResponse()
    }

    return createTopProductsResponse(products)
  } catch (error) {
    console.error("Unexpected error while loading top products", { error })
    return createFallbackTopProductsResponse()
  }
}
