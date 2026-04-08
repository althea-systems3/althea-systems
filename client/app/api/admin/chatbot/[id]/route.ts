import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getCurrentUser } from "@/lib/auth/session"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"
import { normalizeString } from "@/lib/admin/common"

type RouteContext = {
  params: Promise<{ id: string }>
}

type ChatbotConversationPatchPayload = {
  status?: unknown
}

type HandoverStatus = "pending" | "in_progress" | "handled"

function parseStatus(value: unknown): HandoverStatus | null {
  if (value === "pending" || value === "in_progress" || value === "handled") {
    return value
  }

  return null
}

export async function GET(_request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params
    const conversationId = normalizeString(id)

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "Identifiant conversation invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const firestore = getFirestoreClient()
    const document = await firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .doc(conversationId)
      .get()

    if (!document.exists) {
      return NextResponse.json(
        {
          error: "Conversation introuvable.",
          code: "conversation_not_found",
        },
        { status: 404 },
      )
    }

    const conversation = document.data() ?? {}

    return NextResponse.json({
      conversation: {
        conversationId,
        userId: (conversation.user_id as string | undefined) ?? null,
        sessionId: (conversation.session_id as string | undefined) ?? null,
        collectedEmail:
          (conversation.collected_email as string | undefined) ?? null,
        collectedSubject:
          (conversation.collected_subject as string | undefined) ?? null,
        handoverStatus:
          (conversation.human_handover?.status as string | undefined) ?? "none",
        assignedAdminId:
          (conversation.human_handover?.assigned_admin_id as
            | string
            | undefined) ?? null,
        createdAt: (conversation.created_at as string | undefined) ?? null,
        updatedAt: (conversation.updated_at as string | undefined) ?? null,
        messages:
          (conversation.message as Array<{
            role?: string
            content?: string
            timestamp?: string
          }>) ?? [],
      },
    })
  } catch (error) {
    console.error("Erreur detail conversation chatbot admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params
    const conversationId = normalizeString(id)

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "Identifiant conversation invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as ChatbotConversationPatchPayload | null

    const status = parseStatus(body?.status)

    if (!status) {
      return NextResponse.json(
        {
          error: "Statut de conversation invalide.",
          code: "status_invalid",
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

    const firestore = getFirestoreClient()
    const docRef = firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .doc(conversationId)

    await docRef.set(
      {
        conversation_id: conversationId,
        updated_at: new Date().toISOString(),
        human_handover: {
          status,
          assigned_admin_id: currentUser.user.id,
          updated_at: new Date().toISOString(),
        },
      },
      { merge: true },
    )

    const updatedDoc = await docRef.get()

    return NextResponse.json({
      conversation: {
        conversationId,
        ...(updatedDoc.data() ?? {}),
      },
    })
  } catch (error) {
    console.error("Erreur mise a jour conversation chatbot admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
