import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type PaymentMethodRow = {
  id_paiement: string
  nom_carte: string
  derniers_4_chiffres: string
  date_expiration: string
  est_defaut: boolean
}

type PaymentMethodPayload = {
  id: string
  cardHolder: string
  last4: string
  expiry: string
  isDefault: boolean
}

function mapPaymentMethodRow(row: PaymentMethodRow): PaymentMethodPayload {
  return {
    id: row.id_paiement,
    cardHolder: row.nom_carte,
    last4: row.derniers_4_chiffres,
    expiry: row.date_expiration,
    isDefault: row.est_defaut,
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const supabaseAdmin = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ paymentMethods: [] })
    }

    const { data, error } = await supabaseAdmin
      .from("methode_paiement")
      .select(
        "id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut",
      )
      .eq("id_utilisateur", user.id)
      .order("est_defaut", { ascending: false })

    if (error || !data) {
      console.error("Erreur lecture méthodes paiement checkout", { error })
      return NextResponse.json({ paymentMethods: [] })
    }

    const paymentMethods = (data as PaymentMethodRow[]).map(mapPaymentMethodRow)

    return NextResponse.json({ paymentMethods })
  } catch (error) {
    console.error("Erreur inattendue méthodes paiement checkout", { error })
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
