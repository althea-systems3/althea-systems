import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeString } from "@/lib/admin/common"

type OrderStatus = "en_attente" | "en_cours" | "terminee" | "annulee"

type OrderRow = {
  id_commande: string
  numero_commande: string
  date_commande: string
  montant_ttc: number
  statut: OrderStatus
  id_utilisateur: string
  utilisateur: {
    nom_complet: string | null
    email: string | null
  } | null
}

function parseSort(value: string): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc"
}

function parseStatus(value: string): OrderStatus | null {
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

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const statusFilter = parseStatus(
      normalizeString(request.nextUrl.searchParams.get("status")),
    )
    const sortOrder = parseSort(
      normalizeString(request.nextUrl.searchParams.get("sort")),
    )
    const search = normalizeString(request.nextUrl.searchParams.get("search"))

    const supabaseAdmin = createAdminClient()

    let query = supabaseAdmin
      .from("commande")
      .select(
        "id_commande, numero_commande, date_commande, montant_ttc, statut, id_utilisateur, utilisateur:id_utilisateur(nom_complet, email)",
      )
      .order("date_commande", { ascending: sortOrder === "asc" })
      .limit(250)

    if (statusFilter) {
      query = query.eq("statut", statusFilter)
    }

    if (search) {
      query = query.ilike("numero_commande", `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Erreur lecture commandes admin", { error })

      return NextResponse.json(
        {
          error: "Erreur lors du chargement des commandes.",
          code: "admin_orders_read_failed",
        },
        { status: 500 },
      )
    }

    const orders = (data as OrderRow[] | null) ?? []

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Erreur inattendue lecture commandes admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
