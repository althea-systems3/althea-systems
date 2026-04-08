import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeString } from "@/lib/admin/common"

type UserRow = {
  id_utilisateur: string
  email: string
  nom_complet: string
  est_admin: boolean
  statut: string
  date_inscription: string
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const search = normalizeString(request.nextUrl.searchParams.get("search"))

    const supabaseAdmin = createAdminClient()

    let query = supabaseAdmin
      .from("utilisateur")
      .select(
        "id_utilisateur, email, nom_complet, est_admin, statut, date_inscription",
      )
      .order("date_inscription", { ascending: false })
      .limit(250)

    if (search) {
      query = query.or(`email.ilike.%${search}%,nom_complet.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Erreur lecture utilisateurs admin", { error })

      return NextResponse.json(
        {
          error: "Erreur lors du chargement des utilisateurs.",
          code: "admin_users_read_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      users: (data as UserRow[] | null) ?? [],
    })
  } catch (error) {
    console.error("Erreur inattendue lecture utilisateurs admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
