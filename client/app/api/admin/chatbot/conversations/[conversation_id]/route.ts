import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"
import type { ConversationDocument } from "@/lib/chatbot/types"

type RouteContext = {
  params: Promise<{ conversation_id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
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

    const firestore = getFirestoreClient()
    const doc = await firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .doc(conversation_id)
      .get()

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Conversation introuvable.", code: "not_found" },
        { status: 404 },
      )
    }

    const data = doc.data() as ConversationDocument

    return NextResponse.json({
      conversation: {
        conversation_id: data.conversation_id ?? conversation_id,
        user_id: data.user_id ?? null,
        session_id: data.session_id ?? null,
        created_at: data.created_at ?? null,
        last_message_at: data.last_message_at ?? null,
        messages: data.message ?? [],
        metadata: data.metadata ?? {},
      },
    })
  } catch (error) {
    console.error("Erreur détail conversation chatbot admin", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
