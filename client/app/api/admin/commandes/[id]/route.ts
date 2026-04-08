import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeString } from "@/lib/admin/common"

type OrderStatus = "en_attente" | "en_cours" | "terminee" | "annulee"

type RouteContext = {
  params: Promise<{ id: string }>
}

type OrderStatusPayload = {
  statut?: unknown
}

function parseStatus(value: unknown): OrderStatus | null {
  if (
    value === "en_attente" ||
    value === "en_cours" ||
    value === "terminee" ||
    value === "annulee"
  ) {
    return value
  }

  return null
}

export async function GET(_request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params

    if (!normalizeString(id)) {
      return NextResponse.json(
        {
          error: "Identifiant commande invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: order, error: orderError } = await supabaseAdmin
      .from("commande")
      .select(
        "id_commande, numero_commande, date_commande, montant_ht, montant_tva, montant_ttc, statut, statut_paiement, mode_paiement, paiement_dernier_4, id_utilisateur, id_adresse, utilisateur:id_utilisateur(nom_complet, email)",
      )
      .eq("id_commande", id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        {
          error: "Commande introuvable.",
          code: "order_not_found",
        },
        { status: 404 },
      )
    }

    const [linesResult, addressResult] = await Promise.all([
      supabaseAdmin
        .from("ligne_commande")
        .select(
          "id_ligne, id_produit, quantite, prix_unitaire_ht, prix_total_ttc, produit:id_produit(nom, slug)",
        )
        .eq("id_commande", id),
      supabaseAdmin
        .from("adresse")
        .select(
          "id_adresse, prenom, nom, adresse_1, adresse_2, ville, region, code_postal, pays, telephone",
        )
        .eq("id_adresse", (order as { id_adresse: string }).id_adresse)
        .single(),
    ])

    return NextResponse.json({
      order,
      lines: linesResult.data ?? [],
      address: addressResult.data ?? null,
    })
  } catch (error) {
    console.error("Erreur inattendue detail commande admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
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
        {
          error: "Identifiant commande invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as OrderStatusPayload | null

    const nextStatus = parseStatus(body?.statut)

    if (!nextStatus) {
      return NextResponse.json(
        {
          error: "Statut de commande invalide.",
          code: "status_invalid",
        },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("commande")
      .update({ statut: nextStatus } as never)
      .eq("id_commande", id)
      .select(
        "id_commande, numero_commande, date_commande, montant_ttc, statut, statut_paiement",
      )
      .single()

    if (updateError || !updatedOrder) {
      console.error("Erreur mise a jour statut commande", { updateError })

      return NextResponse.json(
        {
          error: "Impossible de mettre à jour le statut.",
          code: "order_status_update_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error("Erreur inattendue mise a jour commande admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
