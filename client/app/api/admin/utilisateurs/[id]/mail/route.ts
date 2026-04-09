import { NextRequest, NextResponse } from "next/server"

import { normalizeString } from "@/lib/admin/common"
import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { sendAdminDirectEmail } from "@/lib/auth/email"
import { getCurrentUser } from "@/lib/auth/session"
import { logAdminActivity } from "@/lib/firebase/logActivity"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ id: string }>
}

type SendMailPayload = {
  subject?: unknown
  content?: unknown
}

const MIN_SUBJECT_LENGTH = 3
const MAX_SUBJECT_LENGTH = 160
const MIN_CONTENT_LENGTH = 5
const MAX_CONTENT_LENGTH = 5000

function toSafeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

async function fetchUserIdentity(userId: string): Promise<{
  email: string
  nom_complet: string
  statut: string
} | null> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("utilisateur")
    .select("email, nom_complet, statut")
    .eq("id_utilisateur", userId)
    .single()

  if (error || !data) {
    return null
  }

  const row = data as {
    email: string
    nom_complet: string
    statut: string
  }

  return row
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params
    const userId = normalizeString(id)

    if (!userId) {
      return NextResponse.json(
        {
          error: "Identifiant utilisateur invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as SendMailPayload | null
    const subject = toSafeString(body?.subject)
    const content = toSafeString(body?.content)

    if (
      subject.length < MIN_SUBJECT_LENGTH ||
      subject.length > MAX_SUBJECT_LENGTH
    ) {
      return NextResponse.json(
        {
          error: "Sujet invalide.",
          code: "subject_invalid",
        },
        { status: 400 },
      )
    }

    if (
      content.length < MIN_CONTENT_LENGTH ||
      content.length > MAX_CONTENT_LENGTH
    ) {
      return NextResponse.json(
        {
          error: "Contenu du message invalide.",
          code: "content_invalid",
        },
        { status: 400 },
      )
    }

    const userIdentity = await fetchUserIdentity(userId)

    if (!userIdentity) {
      return NextResponse.json(
        {
          error: "Utilisateur introuvable.",
          code: "user_not_found",
        },
        { status: 404 },
      )
    }

    await sendAdminDirectEmail({
      recipientEmail: userIdentity.email,
      customerName: userIdentity.nom_complet || "Client",
      subject,
      message: content,
    })

    const currentUser = await getCurrentUser()

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, "users.send_email", {
        userId,
        subject,
      })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Erreur envoi email utilisateur admin", { error })

    return NextResponse.json(
      {
        error: "Impossible d envoyer le mail a l utilisateur.",
        code: "send_mail_failed",
      },
      { status: 500 },
    )
  }
}
