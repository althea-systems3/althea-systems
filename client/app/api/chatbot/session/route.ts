import crypto from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateCartSessionId } from "@/lib/auth/cartSession"
import { getOrCreateConversation } from "@/lib/chatbot/firestore"
import { logChatbotActivity } from "@/lib/chatbot/logger"

type SessionRequestBody = {
  session_id?: unknown
  source?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SessionRequestBody | null

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
      sessionId = `chat-${crypto.randomUUID()}`
    }

    const source =
      body?.source === "page_contact" ? "page_contact" : "widget"

    const { conversationId, isNew, messages } = await getOrCreateConversation({
      sessionId,
      userId: user?.id ?? null,
      source,
    })

    if (isNew) {
      await logChatbotActivity("chatbot_session_created", {
        conversation_id: conversationId,
        user_id: user?.id ?? null,
        source,
      })
    }

    return NextResponse.json({
      conversation_id: conversationId,
      historique: messages,
    })
  } catch (error) {
    console.error("Erreur création session chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
