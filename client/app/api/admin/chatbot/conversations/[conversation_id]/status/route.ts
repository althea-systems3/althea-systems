import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getCurrentUser } from "@/lib/auth/session"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"
import { logChatbotActivity } from "@/lib/chatbot/logger"
import type { ConversationStatus } from "@/lib/chatbot/types"

type RouteContext = {
  params: Promise<{ conversation_id: string }>
}

const ALLOWED_STATUS: ConversationStatus[] = ["resolved", "abandoned"]

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
    const status = body?.status as ConversationStatus | undefined

    if (!status || !ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        {
          error: `Statut invalide. Valeurs acceptées : ${ALLOWED_STATUS.join(", ")}.`,
          code: "status_invalid",
        },
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
        metadata: { status },
      },
      { merge: true },
    )

    const currentUser = await getCurrentUser()

    if (status === "resolved") {
      await logChatbotActivity("chatbot_resolved", {
        conversation_id,
        user_id: currentUser?.user?.id ?? null,
      })
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error("Erreur mise à jour statut conversation chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
