import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeString } from "@/lib/admin/common"

type RouteContext = {
  params: Promise<{ id: string }>
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
          error: "Identifiant utilisateur invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()

    const [userResultRaw, addressesResultRaw, paymentMethodsResultRaw] =
      await Promise.all([
        supabaseAdmin
          .from("utilisateur")
          .select(
            "id_utilisateur, email, nom_complet, est_admin, statut, email_verifie, date_inscription, cgu_acceptee_le, date_validation_email",
          )
          .eq("id_utilisateur", id)
          .single(),
        supabaseAdmin
          .from("adresse")
          .select(
            "id_adresse, prenom, nom, adresse_1, adresse_2, ville, region, code_postal, pays, telephone",
          )
          .eq("id_utilisateur", id)
          .order("id_adresse", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("methode_paiement")
          .select(
            "id_paiement, nom_carte, derniers_4_chiffres, date_expiration, stripe_payment_id, est_defaut",
          )
          .eq("id_utilisateur", id)
          .order("id_paiement", { ascending: false })
          .limit(20),
      ])

    const userResult = userResultRaw as {
      data: Record<string, unknown> | null
      error: unknown
    }

    const addressesResult = addressesResultRaw as {
      data: Array<Record<string, unknown>> | null
      error: unknown
    }

    const paymentMethodsResult = paymentMethodsResultRaw as {
      data: Array<Record<string, unknown>> | null
      error: unknown
    }

    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        {
          error: "Utilisateur introuvable.",
          code: "user_not_found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      user: userResult.data,
      addresses: addressesResult.data ?? [],
      paymentMethods: paymentMethodsResult.data ?? [],
    })
  } catch (error) {
    console.error("Erreur inattendue detail utilisateur admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
