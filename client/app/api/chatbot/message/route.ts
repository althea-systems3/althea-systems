import { randomUUID } from "node:crypto"
import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { toAppLocale } from "@/lib/i18n"

import { checkRateLimit, securityCheck } from "@/lib/chatbot/security"
import {
  selectKnowledgeBlocks,
  fetchRelevantProducts,
  messageContainsProductKeyword,
  formatKnowledgeBlocks,
} from "@/lib/chatbot/rag"
import { buildSystemPrompt } from "@/lib/chatbot/prompts"
import { callGroq } from "@/lib/chatbot/groq"
import { analyzeResponse } from "@/lib/chatbot/analyzer"
import {
  getConversation,
  saveExchange,
  buildClaudeHistory,
  persistEscalation,
} from "@/lib/chatbot/firestore"
import { logChatbotActivity } from "@/lib/chatbot/logger"
import type { UserContext } from "@/lib/chatbot/types"

type MessageRequestBody = {
  conversation_id?: unknown
  message?: unknown
}

type UserProfile = {
  prenom: string | null
  nom: string | null
  statut: string | null
}

const FALLBACK_MESSAGES: Record<string, string> = {
  fr: "Je rencontre une difficulté technique. Votre demande a bien été notée, un agent vous contactera.",
  en: "I'm experiencing a technical issue. Your request has been noted, an agent will contact you.",
  es: "Estoy experimentando una dificultad técnica. Su solicitud ha sido registrada, un agente le contactará.",
  ar: "أواجه صعوبة تقنية. تم تسجيل طلبك، سيتصل بك أحد الوكلاء.",
}

const TOO_LONG_MESSAGES: Record<string, string> = {
  fr: "Votre message est trop long.",
  en: "Your message is too long.",
  es: "Su mensaje es demasiado largo.",
  ar: "رسالتك طويلة جداً.",
}

const RATE_LIMIT_MESSAGES: Record<string, string> = {
  fr: "Trop de messages. Attendez quelques instants.",
  en: "Too many messages. Please wait a moment.",
  es: "Demasiados mensajes. Por favor, espere un momento.",
  ar: "عدد كبير جداً من الرسائل. يرجى الانتظار.",
}

const INJECTION_MESSAGES: Record<string, string> = {
  fr: "Je ne peux pas traiter cette demande.",
  en: "I cannot process this request.",
  es: "No puedo procesar esta solicitud.",
  ar: "لا أستطيع معالجة هذا الطلب.",
}

const SENSITIVE_MESSAGES: Record<string, string> = {
  fr: "Pour votre sécurité, ne partagez jamais vos données bancaires ou mots de passe dans un chat.",
  en: "For your security, never share your banking details or passwords in a chat.",
  es: "Por su seguridad, nunca comparta sus datos bancarios o contraseñas en un chat.",
  ar: "لأمانك، لا تشارك أبداً بياناتك المصرفية أو كلمات مرورك في الدردشة.",
}

async function resolveUserContext(userId: string, email: string | undefined): Promise<UserContext> {
  const supabaseAdmin = createAdminClient()

  const [profileResult, countResult] = await Promise.all([
    supabaseAdmin
      .from("utilisateur")
      .select("prenom, nom, statut")
      .eq("id_utilisateur", userId)
      .single(),
    supabaseAdmin
      .from("commande")
      .select("*", { count: "exact", head: true })
      .eq("id_utilisateur", userId),
  ])

  const profile = profileResult.data as UserProfile | null
  const fullName = profile
    ? `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim()
    : ""

  return {
    isAuthenticated: true,
    nom: fullName || undefined,
    email,
    nb_commandes: countResult.count ?? 0,
    statut: profile?.statut ?? "actif",
  }
}

function handleSecurityFailure(
  reason: string,
  conversationId: string,
  locale: string,
): NextResponse {
  if (reason === "too_long") {
    return NextResponse.json(
      { error: TOO_LONG_MESSAGES[locale], code: "message_too_long" },
      { status: 400 },
    )
  }
  if (reason === "sensitive_data") {
    return NextResponse.json({
      conversation_id: conversationId,
      reponse: SENSITIVE_MESSAGES[locale],
      escalade: false,
    })
  }
  // injection
  return NextResponse.json({
    conversation_id: conversationId,
    reponse: INJECTION_MESSAGES[locale],
    escalade: false,
  })
}

export async function POST(request: Request) {
  const requestHeaders = await headers()
  const localeHeader =
    requestHeaders.get("x-locale") ??
    requestHeaders.get("accept-language") ??
    "fr"
  const locale = toAppLocale(localeHeader.split(",")[0].split("-")[0])

  try {
    const body = (await request.json().catch(() => null)) as MessageRequestBody | null

    const rawMessage = typeof body?.message === "string" ? body.message : ""
    const conversationId =
      typeof body?.conversation_id === "string" && body.conversation_id.trim()
        ? body.conversation_id.trim()
        : randomUUID()

    // ── Rate limiting ────────────────────────────────────────────────────────
    const forwardedFor = requestHeaders.get("x-forwarded-for") ?? "unknown"
    const rateResult = checkRateLimit(`${forwardedFor}:${conversationId}`)

    if (!rateResult.allowed) {
      await logChatbotActivity("chatbot_rate_limit_hit", { conversation_id: conversationId })
      return NextResponse.json(
        { error: RATE_LIMIT_MESSAGES[locale], code: "rate_limit" },
        { status: 429 },
      )
    }

    // ── Security check ───────────────────────────────────────────────────────
    const secResult = securityCheck(rawMessage)

    if (!secResult.safe) {
      if (secResult.reason === "injection") {
        await logChatbotActivity("chatbot_injection_detected", { conversation_id: conversationId })
      }
      return handleSecurityFailure(secResult.reason, conversationId, locale)
    }

    const userMessage = secResult.sanitized

    // ── Auth context ─────────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userContext: UserContext = user
      ? await resolveUserContext(user.id, user.email)
      : { isAuthenticated: false }

    // ── Load history + RAG in parallel ──────────────────────────────────────
    const [conversation, knowledgeBlocks, productSection] = await Promise.all([
      getConversation(conversationId),
      selectKnowledgeBlocks(userMessage),
      messageContainsProductKeyword(userMessage)
        ? fetchRelevantProducts(userMessage)
        : Promise.resolve(""),
    ])

    const history = conversation ? buildClaudeHistory(conversation.message) : []
    const systemPrompt = buildSystemPrompt({
      locale,
      knowledgeSection: formatKnowledgeBlocks(knowledgeBlocks),
      productSection,
      userContext,
    })

    // ── Call Claude ──────────────────────────────────────────────────────────
    let rawResponse: string

    try {
      rawResponse = await callGroq(systemPrompt, history, userMessage)
    } catch (apiError) {
      console.error("Erreur API Anthropic", { apiError, conversationId })
      await logChatbotActivity("chatbot_api_error", {
        conversation_id: conversationId,
        user_id: user?.id ?? null,
      })
      await persistEscalation({ conversationId, reason: "timeout" })
      return NextResponse.json({
        conversation_id: conversationId,
        reponse: FALLBACK_MESSAGES[locale],
        escalade: true,
      })
    }

    // ── Analyze + persist ────────────────────────────────────────────────────
    const analyzed = analyzeResponse(rawResponse)

    await Promise.all([
      saveExchange({
        conversationId,
        userMessage,
        botMessage: analyzed.cleanText,
        capturedEmail: analyzed.capturedEmail,
        capturedSubject: analyzed.capturedSubject,
        escalated: analyzed.escalationRequired,
        escalationReason: "bot_fallback",
      }),
      logChatbotActivity("chatbot_message_sent", {
        conversation_id: conversationId,
        user_id: user?.id ?? null,
      }),
      ...(analyzed.escalationRequired
        ? [
            logChatbotActivity("chatbot_escalation", {
              conversation_id: conversationId,
              user_id: user?.id ?? null,
              reason: "bot_fallback",
            }),
          ]
        : []),
    ])

    return NextResponse.json({
      conversation_id: conversationId,
      reponse: analyzed.cleanText,
      escalade: analyzed.escalationRequired,
      captured: {
        email: analyzed.capturedEmail,
        subject: analyzed.capturedSubject,
      },
    })
  } catch (error) {
    console.error("Erreur inattendue endpoint chatbot/message", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
