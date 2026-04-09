import { NextRequest, NextResponse } from "next/server"

import { normalizeString } from "@/lib/admin/common"
import { deleteCategoryImages } from "@/lib/admin/categoryImages"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getStorageClient } from "@/lib/firebase/admin"
import { CATEGORIES_STORAGE_PATH } from "@/lib/categories/constants"
import { getCurrentUser } from "@/lib/auth/session"
import { logAdminActivity } from "@/lib/firebase/logActivity"

type RouteParams = { params: Promise<{ id: string }> }

async function categoryExists(categoryId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("categorie")
    .select("id_categorie")
    .eq("id_categorie", categoryId)
    .single()

  return !error && Boolean(data)
}

async function deleteCategoryStorageFiles(categoryId: string): Promise<void> {
  const storage = getStorageClient()
  const bucket = storage.bucket()
  const prefix = `${CATEGORIES_STORAGE_PATH}/${categoryId}/`

  const [files] = await bucket.getFiles({ prefix })

  await Promise.all(
    files.map((file) => {
      return file.delete({ ignoreNotFound: true })
    }),
  )
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess()
  if (denied) {
    return denied
  }

  const { id } = await params
  const categoryId = normalizeString(id)

  if (!categoryId) {
    return NextResponse.json(
      { error: "Identifiant catégorie invalide." },
      { status: 400 },
    )
  }

  const hasCategory = await categoryExists(categoryId)
  if (!hasCategory) {
    return NextResponse.json(
      { error: "Catégorie introuvable." },
      { status: 404 },
    )
  }

  const supabase = createAdminClient()
  const { error: updateError } = await supabase
    .from("categorie")
    .update({ image_url: null } as never)
    .eq("id_categorie", categoryId)

  if (updateError) {
    console.error("Erreur suppression image_url catégorie", { updateError })
    return NextResponse.json(
      { error: "Impossible de supprimer l image de la catégorie." },
      { status: 500 },
    )
  }

  try {
    await deleteCategoryImages(categoryId)
  } catch (firestoreError) {
    console.error("Erreur suppression image Firestore catégorie", {
      firestoreError,
    })
  }

  try {
    await deleteCategoryStorageFiles(categoryId)
  } catch (storageError) {
    console.error("Erreur suppression image Storage catégorie", {
      storageError,
    })
  }

  const currentUser = await getCurrentUser()
  if (currentUser) {
    await logAdminActivity(currentUser.user.id, "categories.image_delete", {
      categoryId,
    })
  }

  return NextResponse.json({ success: true })
}
