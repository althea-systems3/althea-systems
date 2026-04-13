import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateCartSessionId } from "@/lib/auth/cartSession"
import { getConversation } from "@/lib/chatbot/firestore"

type RouteContext = {
  params: Promise<{ conversation_id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { conversation_id } = await params

    if (!conversation_id?.trim()) {
      return NextResponse.json(
        { error: "Identifiant de conversation manquant.", code: "id_required" },
        { status: 400 },
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let sessionId: string
    try {
      const session = await getOrCreateCartSessionId()
      sessionId = session.sessionId
    } catch {
      sessionId = `chat-${randomUUID()}`
    }

    const conversation = await getConversation(conversation_id)

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation introuvable.", code: "not_found" },
        { status: 404 },
      )
    }

    const isOwner =
      (user && conversation.user_id === user.id) ||
      conversation.session_id === sessionId

    if (!isOwner) {
      return NextResponse.json(
        { error: "Accès non autorisé.", code: "forbidden" },
        { status: 403 },
      )
    }

    return NextResponse.json({
      conversation_id: conversation.conversation_id,
      messages: conversation.message,
      metadata: conversation.metadata,
    })
  } catch (error) {
    console.error("Erreur lecture conversation chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
