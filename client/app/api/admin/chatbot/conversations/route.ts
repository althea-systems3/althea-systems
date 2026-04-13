import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"
import type { ConversationDocument, ConversationStatus } from "@/lib/chatbot/types"

type ConversationSummary = {
  conversation_id: string
  user_id: string | null
  session_id: string | null
  email: string | null
  subject: string | null
  status: ConversationStatus
  escalated_to_human: boolean
  escalation_at: string | null
  assigned_admin_id: string | null
  last_message_at: string | null
  nb_messages: number
  last_message_preview: string | null
}

function toSummary(doc: ConversationDocument, fallbackId: string): ConversationSummary {
  const lastMessage = doc.message?.[doc.message.length - 1]

  return {
    conversation_id: doc.conversation_id ?? fallbackId,
    user_id: doc.user_id ?? null,
    session_id: doc.session_id ?? null,
    email: doc.metadata?.email ?? null,
    subject: doc.metadata?.subject ?? null,
    status: doc.metadata?.status ?? "active",
    escalated_to_human: doc.metadata?.escalated_to_human ?? false,
    escalation_at: doc.metadata?.escalation_at ?? null,
    assigned_admin_id: doc.metadata?.assigned_admin_id ?? null,
    last_message_at: doc.last_message_at ?? null,
    nb_messages: doc.metadata?.nb_messages ?? doc.message?.length ?? 0,
    last_message_preview:
      typeof lastMessage?.content === "string"
        ? lastMessage.content.slice(0, 120)
        : null,
  }
}

export async function GET(request: NextRequest) {
  const denied = await verifyAdminAccess()
  if (denied) return denied

  try {
    const params = request.nextUrl.searchParams
    const statusFilter = params.get("status") ?? "all"
    const search = (params.get("search") ?? "").toLowerCase().trim()
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20", 10)))

    const firestore = getFirestoreClient()
    const snapshot = await firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .limit(500)
      .get()

    let conversations = snapshot.docs.map((doc) =>
      toSummary(doc.data() as ConversationDocument, doc.id),
    )

    // Filter by status
    if (statusFilter === "escalated") {
      conversations = conversations.filter((c) => c.status === "escalated")
    } else if (statusFilter === "active") {
      conversations = conversations.filter((c) => c.status === "active")
    } else if (statusFilter === "resolved") {
      conversations = conversations.filter((c) => c.status === "resolved")
    } else if (statusFilter === "abandoned") {
      conversations = conversations.filter((c) => c.status === "abandoned")
    }

    // Search
    if (search) {
      conversations = conversations.filter(
        (c) =>
          c.conversation_id.toLowerCase().includes(search) ||
          (c.email ?? "").toLowerCase().includes(search) ||
          (c.subject ?? "").toLowerCase().includes(search),
      )
    }

    // Sort by escalation_at desc for escalated, otherwise last_message_at desc
    conversations.sort((a, b) => {
      const dateA =
        (a.escalation_at ? new Date(a.escalation_at) : new Date(a.last_message_at ?? 0)).getTime()
      const dateB =
        (b.escalation_at ? new Date(b.escalation_at) : new Date(b.last_message_at ?? 0)).getTime()
      return dateB - dateA
    })

    const total = conversations.length
    const totalPages = Math.ceil(total / limit)
    const paginated = conversations.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      conversations: paginated,
      pagination: { page, limit, total, totalPages },
    })
  } catch (error) {
    console.error("Erreur lecture conversations chatbot admin", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
