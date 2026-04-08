import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"

type ContactMessageRow = {
  id_message: string
  email: string
  sujet: string
  contenu: string
  date_envoie: string
  est_traite: boolean
  id_admin_traitement: string | null
}

function parseLimit(searchParams: URLSearchParams): number {
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "50", 10)

  if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
    return 50
  }

  return Math.min(rawLimit, 200)
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const limit = parseLimit(request.nextUrl.searchParams)
    const statusFilter = request.nextUrl.searchParams.get("status")

    const supabaseAdmin = createAdminClient()

    let query = supabaseAdmin
      .from("message_contact")
      .select(
        "id_message, email, sujet, contenu, date_envoie, est_traite, id_admin_traitement",
      )
      .order("date_envoie", { ascending: false })
      .limit(limit)

    if (statusFilter === "processed") {
      query = query.eq("est_traite", true)
    }

    if (statusFilter === "pending") {
      query = query.eq("est_traite", false)
    }

    const { data, error } = await query

    if (error) {
      console.error("Erreur lecture admin message_contact", { error })

      return NextResponse.json(
        {
          error: "Erreur lors du chargement des messages de contact.",
          code: "contact_messages_read_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      messages: (data ?? []) as ContactMessageRow[],
    })
  } catch (error) {
    console.error("Erreur inattendue endpoint admin contact-messages", {
      error,
    })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
