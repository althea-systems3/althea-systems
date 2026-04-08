import crypto from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateCartSessionId } from "@/lib/auth/cartSession"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"
import { EMAIL_PATTERN, normalizeContactText } from "@/lib/contact/validation"
import { sanitizeChatContent } from "@/lib/contact/chatbot"

type EscalationRequestBody = {
  conversationId?: unknown
  email?: unknown
  subject?: unknown
  transcript?: unknown
}

type TranscriptMessage = {
  role?: unknown
  content?: unknown
}

function toTranscriptSummary(value: unknown): string {
  if (!Array.isArray(value)) {
    return ""
  }

  return value
    .map((item) => {
      const message = item as TranscriptMessage
      const role = normalizeContactText(message.role).toLowerCase() || "user"
      const safeContent = sanitizeChatContent(message.content)

      if (!safeContent) {
        return ""
      }

      return `${role}: ${safeContent}`
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, 3000)
}

async function persistEscalationFlag(params: {
  conversationId: string
  email: string | null
  subject: string | null
}) {
  try {
    const firestore = getFirestoreClient()
    const docRef = firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .doc(params.conversationId)

    await docRef.set(
      {
        conversation_id: params.conversationId,
        collected_email: params.email,
        collected_subject: params.subject,
        human_handover: {
          requested_at: new Date().toISOString(),
          status: "pending",
        },
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Erreur mise a jour escalade conversation chatbot", {
      error,
      conversationId: params.conversationId,
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as EscalationRequestBody | null

    const conversationId = normalizeContactText(body?.conversationId)

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "Identifiant de conversation manquant.",
          code: "conversation_required",
        },
        { status: 400 },
      )
    }

    const normalizedEmail = normalizeContactText(body?.email).toLowerCase()
    const normalizedSubject =
      normalizeContactText(body?.subject) || "Demande support chatbot"

    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json(
        {
          error: "Adresse e-mail invalide.",
          code: "email_invalid",
        },
        { status: 400 },
      )
    }

    const transcriptSummary = toTranscriptSummary(body?.transcript)

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
      console.error("Impossible d initialiser la session escalation chatbot", {
        error,
      })
      sessionId = `chat-${crypto.randomUUID()}`
    }

    const safeEmail =
      normalizedEmail || user?.email || `guest+${sessionId}@chat.local`
    const safeSubject = `[Escalade chatbot] ${normalizedSubject}`

    const escalationContent = [
      "Demande de transfert vers un agent humain depuis le chatbot.",
      `Conversation ID: ${conversationId}`,
      `Session: ${user ? "authenticated" : "guest"}`,
      transcriptSummary
        ? `Historique:\n${transcriptSummary}`
        : "Historique indisponible.",
    ]
      .join("\n\n")
      .slice(0, 3900)

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from("message_contact")
      .insert({
        email: safeEmail,
        sujet: safeSubject,
        contenu: escalationContent,
      } as never)
      .select("id_message")
      .single()

    if (error || !data) {
      console.error("Erreur insertion message escalation", { error })

      return NextResponse.json(
        {
          error: "Impossible de transmettre la demande a un agent.",
          code: "escalation_insert_failed",
        },
        { status: 500 },
      )
    }

    await persistEscalationFlag({
      conversationId,
      email: EMAIL_PATTERN.test(safeEmail) ? safeEmail : null,
      subject: normalizedSubject,
    })

    return NextResponse.json({
      message: "escalation_requested",
      messageId: (data as { id_message: string }).id_message,
    })
  } catch (error) {
    console.error("Erreur inattendue endpoint chatbot escalation", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
