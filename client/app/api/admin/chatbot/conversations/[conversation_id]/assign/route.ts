import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getCurrentUser } from "@/lib/auth/session"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"
import { logChatbotActivity } from "@/lib/chatbot/logger"

type RouteContext = {
  params: Promise<{ conversation_id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await verifyAdminAccess()
  if (denied) return denied

  try {
    const { conversation_id } = await params

    if (!conversation_id?.trim()) {
      return NextResponse.json(
        { error: "Identifiant invalide.", code: "id_required" },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => null)
    const adminId =
      typeof body?.admin_id === "string" && body.admin_id.trim()
        ? body.admin_id.trim()
        : null

    const currentUser = await getCurrentUser()
    const assignedTo = adminId ?? currentUser?.user?.id ?? null

    if (!assignedTo) {
      return NextResponse.json(
        { error: "Identifiant admin manquant.", code: "admin_id_required" },
        { status: 400 },
      )
    }

    const firestore = getFirestoreClient()
    const docRef = firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .doc(conversation_id)

    const existing = await docRef.get()
    if (!existing.exists) {
      return NextResponse.json(
        { error: "Conversation introuvable.", code: "not_found" },
        { status: 404 },
      )
    }

    await docRef.set(
      {
        last_message_at: new Date().toISOString(),
        metadata: {
          assigned_admin_id: assignedTo,
        },
      },
      { merge: true },
    )

    await logChatbotActivity("chatbot_assigned", {
      conversation_id,
      user_id: currentUser?.user?.id ?? null,
      assigned_to: assignedTo,
    })

    return NextResponse.json({ success: true, assigned_admin_id: assignedTo })
  } catch (error) {
    console.error("Erreur assignation conversation chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
