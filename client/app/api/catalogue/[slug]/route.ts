import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_IMAGES_CATEGORIES } from "@/lib/categories/constants"
import type { Categorie } from "@/lib/supabase/types"

type CatalogueCategoryPayload = {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
}

type FirestoreImageDoc = {
  categorie_id: string
  image_url: string
}

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
}

async function fetchCategoryImageUrl(
  categoryId: string,
): Promise<string | null> {
  try {
    const firestore = getFirestoreClient()

    const snapshot = await firestore
      .collection(FIRESTORE_IMAGES_CATEGORIES)
      .where("categorie_id", "==", categoryId)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      const doc = snapshot.docs[0].data() as FirestoreImageDoc
      return doc.image_url ?? null
    }
  } catch (error) {
    console.error("Erreur chargement image Firestore catégorie", {
      categoryId,
      error,
    })
  }

  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!hasRequiredConfig()) {
    return NextResponse.json(
      { category: null, notFound: false },
      { status: 503 },
    )
  }

  try {
    const supabaseAdmin = createAdminClient()

    const { data: rawCategory, error } = await supabaseAdmin
      .from("categorie")
      .select("id_categorie, nom, slug, description, image_url, statut")
      .eq("slug", slug)
      .eq("statut", "active")
      .single()

    if (error || !rawCategory) {
      return NextResponse.json(
        { category: null, notFound: true },
        { status: 404 },
      )
    }

    const category = rawCategory as Categorie

    const firestoreImageUrl = await fetchCategoryImageUrl(category.id_categorie)

    const payload: CatalogueCategoryPayload = {
      id: category.id_categorie,
      name: category.nom,
      slug: category.slug,
      description: category.description,
      imageUrl: firestoreImageUrl ?? category.image_url,
    }

    return NextResponse.json({ category: payload, notFound: false })
  } catch (error) {
    console.error("Erreur inattendue endpoint catalogue catégorie", {
      slug,
      error,
    })
    return NextResponse.json(
      { category: null, notFound: false },
      { status: 500 },
    )
  }
}
