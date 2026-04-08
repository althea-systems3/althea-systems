import crypto from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  buildChatbotReply,
  sanitizeChatContent,
  type ChatbotActionType,
} from "@/lib/contact/chatbot"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { getOrCreateCartSessionId } from "@/lib/auth/cartSession"
import { createServerClient } from "@/lib/supabase/server"

type ChatMessageRole = "user" | "bot"

type ConversationMessage = {
  role: ChatMessageRole
  content: string
  timestamp: string
}

type ChatbotRequestBody = {
  conversationId?: unknown
  message?: unknown
  collectedEmail?: unknown
  collectedSubject?: unknown
}

type ChatbotResponsePayload = {
  conversationId: string
  reply: string
  captured: {
    email: string | null
    subject: string | null
  }
  escalationRecommended: boolean
  actions: ChatbotActionType[]
}

function normalizeConversationId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

function mapConversationMessage(
  role: ChatMessageRole,
  content: string,
): ConversationMessage {
  return {
    role,
    content,
    timestamp: new Date().toISOString(),
  }
}

async function persistConversation(params: {
  conversationId: string
  userId: string | null
  sessionId: string
  email: string | null
  subject: string | null
  newMessages: ConversationMessage[]
}): Promise<void> {
  try {
    const firestore = getFirestoreClient()
    const docRef = firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .doc(params.conversationId)

    const snapshot = await docRef.get()
    const existingMessages = snapshot.exists
      ? (((snapshot.data()?.message as ConversationMessage[] | undefined) ??
          []) as ConversationMessage[])
      : []

    await docRef.set(
      {
        conversation_id: params.conversationId,
        user_id: params.userId,
        session_id: params.sessionId,
        collected_email: params.email,
        collected_subject: params.subject,
        created_at: snapshot.data()?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message: [...existingMessages, ...params.newMessages],
      },
      { merge: true },
    )
  } catch (error) {
    // Firestore est optionnel pour l experience utilisateur : ne jamais bloquer la reponse chatbot.
    console.error("Erreur persistance conversation chatbot", { error })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as ChatbotRequestBody | null

    const userMessage = sanitizeChatContent(body?.message)

    if (!userMessage) {
      return NextResponse.json(
        {
          error: "Message vide.",
          code: "message_required",
        },
        { status: 400 },
      )
    }

    const conversationId =
      normalizeConversationId(body?.conversationId) ?? crypto.randomUUID()

    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    let sessionId: string

    try {
      const session = await getOrCreateCartSessionId()
      sessionId = session.sessionId
    } catch (error) {
      console.error("Impossible d initialiser la session chatbot", { error })
      sessionId = `chat-${crypto.randomUUID()}`
    }

    const botReply = buildChatbotReply({
      message: userMessage,
      collectedEmail: sanitizeChatContent(body?.collectedEmail, 200),
      collectedSubject: sanitizeChatContent(body?.collectedSubject, 140),
    })

    const responsePayload: ChatbotResponsePayload = {
      conversationId,
      reply: botReply.reply,
      captured: {
        email: botReply.capturedEmail,
        subject: botReply.capturedSubject,
      },
      escalationRecommended: botReply.escalationRecommended,
      actions: botReply.actions,
    }

    await persistConversation({
      conversationId,
      userId: user?.id ?? null,
      sessionId,
      email: botReply.capturedEmail,
      subject: botReply.capturedSubject,
      newMessages: [
        mapConversationMessage("user", userMessage),
        mapConversationMessage("bot", botReply.reply),
      ],
    })

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error("Erreur inattendue endpoint chatbot", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
