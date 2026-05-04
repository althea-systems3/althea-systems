/**
 * POST /api/chatbot
 *
 * Legacy endpoint maintenu pour la compatibilité avec le widget frontend (ticket 14A).
 * Délègue au moteur IA : lib/chatbot/
 *
 * Format de réponse adapté au widget existant :
 *   { conversationId, reply, captured: { email, subject }, escalationRecommended, actions }
 */

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
import { logServerError } from "@/lib/errors/serverError"

type LegacyRequestBody = {
  conversationId?: unknown
  message?: unknown
  collectedEmail?: unknown
  collectedSubject?: unknown
}

type UserProfile = {
  prenom: string | null
  nom: string | null
  statut: string | null
}

const FALLBACK: Record<string, string> = {
  fr: "Je rencontre une difficulté technique. Un agent vous contactera.",
  en: "I'm experiencing a technical issue. An agent will contact you.",
  es: "Estoy experimentando una dificultad técnica. Un agente le contactará.",
  ar: "أواجه صعوبة تقنية. سيتصل بك أحد الوكلاء.",
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

export async function POST(request: Request) {
  const requestHeaders = await headers()
  const localeHeader =
    requestHeaders.get("x-locale") ??
    requestHeaders.get("accept-language") ??
    "fr"
  const locale = toAppLocale(localeHeader.split(",")[0].split("-")[0])

  try {
    const body = (await request.json().catch(() => null)) as LegacyRequestBody | null

    const rawMessage = typeof body?.message === "string" ? body.message : ""
    const conversationId =
      typeof body?.conversationId === "string" && body.conversationId.trim()
        ? body.conversationId.trim()
        : randomUUID()

    // Rate limit
    const forwardedFor = requestHeaders.get("x-forwarded-for") ?? "unknown"
    const rateResult = checkRateLimit(`${forwardedFor}:${conversationId}`)
    if (!rateResult.allowed) {
      await logChatbotActivity("chatbot_rate_limit_hit", { conversation_id: conversationId })
      return NextResponse.json(
        { error: "Trop de messages. Attendez quelques instants.", code: "rate_limit" },
        { status: 429 },
      )
    }

    // Security
    const secResult = securityCheck(rawMessage)
    if (!secResult.safe) {
      if (secResult.reason === "injection") {
        await logChatbotActivity("chatbot_injection_detected", { conversation_id: conversationId })
        return NextResponse.json({
          conversationId,
          reply: "Je ne peux pas traiter cette demande.",
          captured: { email: null, subject: null },
          escalationRecommended: false,
          actions: [],
        })
      }
      if (secResult.reason === "too_long") {
        return NextResponse.json(
          { error: "Votre message est trop long.", code: "message_too_long" },
          { status: 400 },
        )
      }
      return NextResponse.json({
        conversationId,
        reply: "Pour votre sécurité, ne partagez jamais vos données bancaires ou mots de passe dans un chat.",
        captured: { email: null, subject: null },
        escalationRecommended: false,
        actions: [],
      })
    }

    const userMessage = secResult.sanitized

    // Auth
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userContext: UserContext = user
      ? await resolveUserContext(user.id, user.email)
      : { isAuthenticated: false }

    // History + RAG
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

    // Claude call
    let rawResponse: string
    try {
      rawResponse = await callGroq(systemPrompt, history, userMessage)
    } catch (apiError) {
      console.error("Erreur API Anthropic (legacy route)", { apiError })
      await logChatbotActivity("chatbot_api_error", {
        conversation_id: conversationId,
        user_id: user?.id ?? null,
      })
      await persistEscalation({ conversationId, reason: "timeout" })
      return NextResponse.json({
        conversationId,
        reply: FALLBACK[locale],
        captured: { email: null, subject: null },
        escalationRecommended: true,
        actions: ["escalate_human"],
      })
    }

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
    ])

    return NextResponse.json({
      conversationId,
      reply: analyzed.cleanText,
      captured: {
        email: analyzed.capturedEmail,
        subject: analyzed.capturedSubject,
      },
      escalationRecommended: analyzed.escalationRequired,
      actions: analyzed.escalationRequired ? ["escalate_human"] : [],
    })
  } catch (error) {
    const errorId = logServerError({
      feature: "api.chatbot.legacy",
      error,
    })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error", errorId },
      { status: 500 },
    )
  }
}
