import crypto from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateCartSessionId } from "@/lib/auth/cartSession"
import { persistEscalation, getConversation } from "@/lib/chatbot/firestore"
import { logChatbotActivity } from "@/lib/chatbot/logger"
import { toAppLocale } from "@/lib/i18n"
import { headers } from "next/headers"

type EscalationReason = "bot_fallback" | "user_request" | "timeout"

type EscalationRequestBody = {
  conversation_id?: unknown
  reason?: unknown
}

function parseReason(value: unknown): EscalationReason {
  if (value === "bot_fallback" || value === "user_request" || value === "timeout") {
    return value
  }
  return "user_request"
}

const SUCCESS_MESSAGES: Record<string, string> = {
  fr: "Votre demande a été transmise à notre équipe de support. Un agent vous contactera dans les meilleurs délais.",
  en: "Your request has been sent to our support team. An agent will contact you as soon as possible.",
  es: "Su solicitud ha sido enviada a nuestro equipo de soporte. Un agente se pondrá en contacto con usted lo antes posible.",
  ar: "تم إرسال طلبك إلى فريق الدعم لدينا. سيتصل بك أحد الوكلاء في أقرب وقت ممكن.",
}

export async function POST(request: Request) {
  // ── Detect locale ────────────────────────────────────────────────────────────
  const requestHeaders = await headers()
  const localeHeader = requestHeaders.get("x-locale") ?? requestHeaders.get("accept-language") ?? "fr"
  const locale = toAppLocale(localeHeader.split(",")[0].split("-")[0])

  try {
    const body = (await request.json().catch(() => null)) as EscalationRequestBody | null

    const conversationId =
      typeof body?.conversation_id === "string" && body.conversation_id.trim()
        ? body.conversation_id.trim()
        : null

    if (!conversationId) {
      return NextResponse.json(
        { error: "Identifiant de conversation manquant.", code: "conversation_required" },
        { status: 400 },
      )
    }

    const reason = parseReason(body?.reason)

    // ── Auth context ─────────────────────────────────────────────────────────
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

    // Verify conversation belongs to this session/user
    const conversation = await getConversation(conversationId)

    if (conversation) {
      const isOwner =
        (user && conversation.user_id === user.id) ||
        conversation.session_id === sessionId

      if (!isOwner) {
        return NextResponse.json(
          { error: "Accès non autorisé.", code: "forbidden" },
          { status: 403 },
        )
      }
    }

    // ── Persist escalation ───────────────────────────────────────────────────
    await persistEscalation({ conversationId, reason })

    // ── Log ──────────────────────────────────────────────────────────────────
    await logChatbotActivity("chatbot_escalation", {
      conversation_id: conversationId,
      user_id: user?.id ?? null,
      reason,
      email: conversation?.metadata?.email ?? null,
    })

    return NextResponse.json({
      success: true,
      message: SUCCESS_MESSAGES[locale],
    })
  } catch (error) {
    console.error("Erreur endpoint chatbot/escalate", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
