import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getCurrentUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeString } from "@/lib/admin/common"

type RouteContext = {
  params: Promise<{ id: string }>
}

type ContactMessagePatchPayload = {
  assignToMe?: unknown
  markProcessed?: unknown
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
          error: "Identifiant message invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as ContactMessagePatchPayload | null

    const assignToMe = body?.assignToMe === true
    const markProcessed = body?.markProcessed === true

    if (!assignToMe && !markProcessed) {
      return NextResponse.json(
        {
          error: "Aucune action demandée.",
          code: "no_action_requested",
        },
        { status: 400 },
      )
    }

    const currentUser = await getCurrentUser()

    if (!currentUser?.user?.id) {
      return NextResponse.json(
        {
          error: "Authentification requise.",
          code: "authentication_required",
        },
        { status: 401 },
      )
    }

    const supabaseAdmin = createAdminClient()

    const updatePayload: {
      id_admin_traitement?: string | null
      est_traite?: boolean
    } = {}

    if (assignToMe) {
      updatePayload.id_admin_traitement = currentUser.user.id
    }

    if (markProcessed) {
      updatePayload.est_traite = true
      updatePayload.id_admin_traitement = currentUser.user.id
    }

    const { data, error } = await supabaseAdmin
      .from("message_contact")
      .update(updatePayload as never)
      .eq("id_message", id)
      .select(
        "id_message, email, sujet, contenu, date_envoie, est_traite, id_admin_traitement",
      )
      .single()

    if (error || !data) {
      console.error("Erreur mise a jour message contact admin", { error })

      return NextResponse.json(
        {
          error: "Erreur lors de la mise à jour du message.",
          code: "contact_message_update_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: data })
  } catch (error) {
    console.error("Erreur inattendue mise a jour message contact", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
