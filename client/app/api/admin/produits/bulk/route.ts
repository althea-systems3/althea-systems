import { NextRequest, NextResponse } from "next/server"

import { normalizeString } from "@/lib/admin/common"
import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"

type ProductStatus = "publie" | "brouillon"
type BulkAction = "delete" | "publish" | "unpublish" | "set_category"

type BulkPayload = {
  action?: unknown
  productIds?: unknown
  categoryId?: unknown
}

const BULK_CHUNK_SIZE = 100

function parseBulkAction(value: unknown): BulkAction | null {
  if (
    value === "delete" ||
    value === "publish" ||
    value === "unpublish" ||
    value === "set_category"
  ) {
    return value
  }

  return null
}

function parseProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(value.map((item) => normalizeString(item)).filter(Boolean)),
  )
}

function splitArrayIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

async function updateProductsStatus(
  productIds: string[],
  status: ProductStatus,
): Promise<boolean> {
  const supabaseAdmin = createAdminClient()
  const productIdChunks = splitArrayIntoChunks(productIds, BULK_CHUNK_SIZE)

  for (const productIdChunk of productIdChunks) {
    const { error } = await supabaseAdmin
      .from("produit")
      .update({ statut: status } as never)
      .in("id_produit", productIdChunk)

    if (error) {
      console.error("Erreur mise a jour statut produits", { error })
      return false
    }
  }

  return true
}

async function deleteProducts(productIds: string[]): Promise<boolean> {
  const supabaseAdmin = createAdminClient()
  const productIdChunks = splitArrayIntoChunks(productIds, BULK_CHUNK_SIZE)

  for (const productIdChunk of productIdChunks) {
    const { error } = await supabaseAdmin
      .from("produit")
      .delete()
      .in("id_produit", productIdChunk)

    if (error) {
      console.error("Erreur suppression groupée produits", { error })
      return false
    }
  }

  return true
}

async function setProductsCategory(
  productIds: string[],
  categoryId: string,
): Promise<boolean> {
  const supabaseAdmin = createAdminClient()

  const { data: category, error: categoryError } = await supabaseAdmin
    .from("categorie")
    .select("id_categorie")
    .eq("id_categorie", categoryId)
    .single()

  if (categoryError || !category) {
    return false
  }

  const productIdChunks = splitArrayIntoChunks(productIds, BULK_CHUNK_SIZE)

  for (const productIdChunk of productIdChunks) {
    const { error: deleteError } = await supabaseAdmin
      .from("produit_categorie")
      .delete()
      .in("id_produit", productIdChunk)

    if (deleteError) {
      console.error("Erreur reset categories produits", { deleteError })
      return false
    }

    const linkRows = productIdChunk.map((productId) => ({
      id_produit: productId,
      id_categorie: categoryId,
    }))

    const { error: insertError } = await supabaseAdmin
      .from("produit_categorie")
      .insert(linkRows as never)

    if (insertError) {
      console.error("Erreur categorie groupée produits", { insertError })
      return false
    }
  }

  return true
}

export async function POST(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const body = (await request.json().catch(() => null)) as BulkPayload | null
    const action = parseBulkAction(body?.action)
    const productIds = parseProductIds(body?.productIds)

    if (!action) {
      return NextResponse.json(
        {
          error: "Action groupée invalide.",
          code: "bulk_action_invalid",
        },
        { status: 400 },
      )
    }

    if (productIds.length === 0) {
      return NextResponse.json(
        {
          error: "Aucun produit sélectionné.",
          code: "bulk_product_ids_required",
        },
        { status: 400 },
      )
    }

    if (action === "delete") {
      const hasDeleted = await deleteProducts(productIds)

      if (!hasDeleted) {
        return NextResponse.json(
          {
            error:
              "Impossible de supprimer la sélection. Certains produits sont peut-être liés à des commandes.",
            code: "bulk_delete_failed",
          },
          { status: 400 },
        )
      }

      return NextResponse.json({
        success: true,
        action,
        affectedCount: productIds.length,
      })
    }

    if (action === "publish" || action === "unpublish") {
      const nextStatus: ProductStatus =
        action === "publish" ? "publie" : "brouillon"
      const hasUpdated = await updateProductsStatus(productIds, nextStatus)

      if (!hasUpdated) {
        return NextResponse.json(
          {
            error: "Impossible de modifier le statut de la sélection.",
            code: "bulk_status_failed",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        action,
        affectedCount: productIds.length,
      })
    }

    const categoryId = normalizeString(body?.categoryId)

    if (!categoryId) {
      return NextResponse.json(
        {
          error: "La catégorie cible est obligatoire.",
          code: "bulk_category_required",
        },
        { status: 400 },
      )
    }

    const hasUpdatedCategory = await setProductsCategory(productIds, categoryId)

    if (!hasUpdatedCategory) {
      return NextResponse.json(
        {
          error: "Impossible de modifier la catégorie pour la sélection.",
          code: "bulk_category_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      action,
      affectedCount: productIds.length,
    })
  } catch (error) {
    console.error("Erreur inattendue actions groupées produits", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
