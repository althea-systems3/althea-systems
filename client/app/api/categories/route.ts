import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Categorie } from "@/lib/supabase/types"

type HomeCategoryPayload = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
}

const FALLBACK_HOME_CATEGORIES: HomeCategoryPayload[] = [
  {
    id: "fallback-category-audio",
    name: "Audio Pro",
    slug: "audio-pro",
    imageUrl: "/carousel/pro-audio.svg",
  },
  {
    id: "fallback-category-reseau",
    name: "Reseaux Industriels",
    slug: "reseaux-industriels",
    imageUrl: "/carousel/industrial-network.svg",
  },
  {
    id: "fallback-category-support",
    name: "Support Technique",
    slug: "support-technique",
    imageUrl: "/carousel/smart-support.svg",
  },
  {
    id: "fallback-category-automatismes",
    name: "Automatismes",
    slug: "automatismes",
    imageUrl: null,
  },
]

function mapToHomeCategoryPayload(category: Categorie): HomeCategoryPayload {
  return {
    id: category.id_categorie,
    name: category.nom,
    slug: category.slug,
    imageUrl: category.image_url,
  }
}

function createFallbackCategoriesResponse() {
  return NextResponse.json({
    categories: FALLBACK_HOME_CATEGORIES,
    isFallbackData: true,
  })
}

function createApiCategoriesResponse(categories: HomeCategoryPayload[]) {
  return NextResponse.json({
    categories,
    isFallbackData: false,
  })
}

export async function GET() {
  try {
    const hasSupabaseConfiguration =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (!hasSupabaseConfiguration) {
      return createFallbackCategoriesResponse()
    }

    const supabaseAdminClient = createAdminClient()

    const { data: rawCategories, error } = await supabaseAdminClient
      .from("categorie")
      .select("id_categorie, nom, slug, image_url, ordre_affiche, statut")
      .eq("statut", "active")
      .order("ordre_affiche", { ascending: true })

    if (error) {
      console.error("Failed to load active categories from Supabase", {
        error,
      })
      return createFallbackCategoriesResponse()
    }

    const categories = (rawCategories ?? []).map((category) => {
      return mapToHomeCategoryPayload(category as Categorie)
    })

    if (categories.length === 0) {
      return createFallbackCategoriesResponse()
    }

    return createApiCategoriesResponse(categories)
  } catch (error) {
    console.error("Unexpected error while loading categories", { error })
    return createFallbackCategoriesResponse()
  }
}
