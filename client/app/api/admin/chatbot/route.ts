import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"
import { normalizeString } from "@/lib/admin/common"

type ChatbotConversationSummary = {
  conversationId: string
  userId: string | null
  sessionId: string | null
  collectedEmail: string | null
  collectedSubject: string | null
  handoverStatus: "none" | "pending" | "in_progress" | "handled"
  assignedAdminId: string | null
  updatedAt: string | null
  messageCount: number
  lastMessagePreview: string | null
}

function parseConversationStatus(value: string): "all" | "pending" | "handled" {
  if (value === "pending") {
    return "pending"
  }

  if (value === "handled") {
    return "handled"
  }

  return "all"
}

function toConversationSummary(
  documentData: FirebaseFirestore.DocumentData,
  fallbackConversationId: string,
): ChatbotConversationSummary {
  const messages =
    (documentData.message as
      | Array<{ role?: string; content?: string; timestamp?: string }>
      | undefined) ?? []

  const lastMessage = messages[messages.length - 1]

  const handoverStatus =
    (documentData.human_handover?.status as
      | "pending"
      | "in_progress"
      | "handled"
      | undefined) ?? "none"

  return {
    conversationId:
      (documentData.conversation_id as string | undefined) ??
      fallbackConversationId,
    userId: (documentData.user_id as string | undefined) ?? null,
    sessionId: (documentData.session_id as string | undefined) ?? null,
    collectedEmail:
      (documentData.collected_email as string | undefined) ?? null,
    collectedSubject:
      (documentData.collected_subject as string | undefined) ?? null,
    handoverStatus,
    assignedAdminId:
      (documentData.human_handover?.assigned_admin_id as string | undefined) ??
      null,
    updatedAt:
      (documentData.updated_at as string | undefined) ??
      (documentData.created_at as string | undefined) ??
      null,
    messageCount: messages.length,
    lastMessagePreview:
      typeof lastMessage?.content === "string"
        ? lastMessage.content.slice(0, 120)
        : null,
  }
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const status = parseConversationStatus(
      normalizeString(request.nextUrl.searchParams.get("status")),
    )
    const search = normalizeString(request.nextUrl.searchParams.get("search"))

    const firestore = getFirestoreClient()
    const snapshot = await firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .limit(300)
      .get()

    let conversations = snapshot.docs.map((doc) =>
      toConversationSummary(doc.data(), doc.id),
    )

    if (status === "pending") {
      conversations = conversations.filter((conversation) =>
        ["pending", "in_progress"].includes(conversation.handoverStatus),
      )
    }

    if (status === "handled") {
      conversations = conversations.filter(
        (conversation) => conversation.handoverStatus === "handled",
      )
    }

    if (search) {
      const normalizedSearch = search.toLowerCase()

      conversations = conversations.filter((conversation) => {
        return (
          conversation.conversationId
            .toLowerCase()
            .includes(normalizedSearch) ||
          (conversation.collectedEmail ?? "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          (conversation.collectedSubject ?? "")
            .toLowerCase()
            .includes(normalizedSearch)
        )
      })
    }

    conversations.sort((conversationA, conversationB) => {
      const dateA = conversationA.updatedAt
        ? new Date(conversationA.updatedAt).getTime()
        : 0
      const dateB = conversationB.updatedAt
        ? new Date(conversationB.updatedAt).getTime()
        : 0

      return dateB - dateA
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("Erreur lecture conversations chatbot admin", { error })

    return NextResponse.json(
      {
        error: "Erreur lors du chargement des conversations chatbot.",
        code: "admin_chatbot_read_failed",
      },
      { status: 500 },
    )
  }
}
