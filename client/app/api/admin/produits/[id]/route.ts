import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  normalizeString,
  parseFiniteNumber,
  slugify,
  toOptionalString,
} from "@/lib/admin/common"

type ProductUpdatePayload = {
  nom?: unknown
  description?: unknown
  prix_ttc?: unknown
  quantite_stock?: unknown
  statut?: unknown
  slug?: unknown
  categoryIds?: unknown
}

function parseCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => normalizeString(item)).filter(Boolean)
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params

    if (!normalizeString(id)) {
      return NextResponse.json(
        { error: "Identifiant produit invalide.", code: "id_invalid" },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as ProductUpdatePayload | null

    const updatePayload: Record<string, unknown> = {}

    const name = normalizeString(body?.nom)

    if (name) {
      updatePayload.nom = name
    }

    if (body?.description !== undefined) {
      updatePayload.description = toOptionalString(body.description)
    }

    if (body?.statut !== undefined) {
      updatePayload.statut = body.statut === "publie" ? "publie" : "brouillon"
    }

    const priceTtc = parseFiniteNumber(body?.prix_ttc)

    if (priceTtc !== null) {
      if (priceTtc < 0) {
        return NextResponse.json(
          {
            error: "Le prix TTC doit être positif.",
            code: "price_invalid",
          },
          { status: 400 },
        )
      }

      const vatRate = 0.2
      const priceHt = Math.round((priceTtc / (1 + vatRate)) * 100) / 100
      updatePayload.prix_ttc = Math.round(priceTtc * 100) / 100
      updatePayload.prix_ht = priceHt
    }

    const stockQuantity = parseFiniteNumber(body?.quantite_stock)

    if (stockQuantity !== null) {
      if (stockQuantity < 0) {
        return NextResponse.json(
          {
            error: "Le stock doit être positif.",
            code: "stock_invalid",
          },
          { status: 400 },
        )
      }

      updatePayload.quantite_stock = Math.round(stockQuantity)
    }

    const customSlug = normalizeString(body?.slug)

    if (customSlug) {
      updatePayload.slug = customSlug
    } else if (name) {
      updatePayload.slug = slugify(name)
    }

    const supabaseAdmin = createAdminClient()

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("produit")
        .update(updatePayload as never)
        .eq("id_produit", id)

      if (updateError) {
        console.error("Erreur mise a jour produit admin", { updateError })

        return NextResponse.json(
          {
            error: "Erreur lors de la mise à jour du produit.",
            code: "admin_product_update_failed",
          },
          { status: 500 },
        )
      }
    }

    if (body?.categoryIds !== undefined) {
      const categoryIds = parseCategoryIds(body.categoryIds)

      const { error: deleteLinksError } = await supabaseAdmin
        .from("produit_categorie")
        .delete()
        .eq("id_produit", id)

      if (deleteLinksError) {
        console.error("Erreur suppression categories produit", {
          deleteLinksError,
        })
      }

      if (categoryIds.length > 0) {
        const linkRows = categoryIds.map((categoryId) => ({
          id_produit: id,
          id_categorie: categoryId,
        }))

        const { error: insertLinksError } = await supabaseAdmin
          .from("produit_categorie")
          .insert(linkRows as never)

        if (insertLinksError) {
          console.error("Erreur insertion categories produit", {
            insertLinksError,
          })
        }
      }
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("produit")
      .select(
        "id_produit, nom, description, prix_ttc, quantite_stock, statut, slug",
      )
      .eq("id_produit", id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        {
          error: "Produit introuvable.",
          code: "product_not_found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Erreur inattendue mise a jour produit admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params

    if (!normalizeString(id)) {
      return NextResponse.json(
        { error: "Identifiant produit invalide.", code: "id_invalid" },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()

    const { error: deleteError } = await supabaseAdmin
      .from("produit")
      .delete()
      .eq("id_produit", id)

    if (deleteError) {
      console.error("Erreur suppression produit admin", { deleteError })

      return NextResponse.json(
        {
          error:
            "Impossible de supprimer ce produit. Il est probablement lié à des commandes.",
          code: "admin_product_delete_failed",
        },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur inattendue suppression produit admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
