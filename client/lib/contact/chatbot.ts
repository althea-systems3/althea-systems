import { CONTACT_MAX_MESSAGE_LENGTH } from "@/lib/contact/constants"
import { EMAIL_PATTERN, normalizeContactText } from "@/lib/contact/validation"

export type ChatbotActionType = "contact_form" | "escalate_human"

export type ChatbotReplyPayload = {
  reply: string
  capturedEmail: string | null
  capturedSubject: string | null
  escalationRecommended: boolean
  actions: ChatbotActionType[]
}

const ESCALATION_KEYWORDS = [
  "agent",
  "humain",
  "human",
  "complexe",
  "complique",
  "urgent",
  "litige",
  "reclamation",
]

const FORM_DETAIL_KEYWORDS = [
  "detail",
  "detailler",
  "long",
  "document",
  "piece jointe",
  "capture",
  "screenshot",
  "devis",
]

const ORDER_KEYWORDS = ["commande", "order", "livraison", "delivery"]

const ACCOUNT_KEYWORDS = [
  "connexion",
  "login",
  "compte",
  "mot de passe",
  "password",
]

const CATALOG_KEYWORDS = [
  "produit",
  "catalogue",
  "prix",
  "stock",
  "disponibilite",
]

function includesKeyword(message: string, keywords: string[]): boolean {
  const normalizedMessage = message.toLowerCase()
  return keywords.some((keyword) => normalizedMessage.includes(keyword))
}

export function sanitizeChatContent(
  value: unknown,
  maxLength = CONTACT_MAX_MESSAGE_LENGTH,
): string {
  const normalized = normalizeContactText(value)

  if (!normalized) {
    return ""
  }

  return normalized
    .replace(/[<>]/g, "")
    .replace(/\s{3,}/g, "  ")
    .slice(0, maxLength)
}

export function extractEmailFromChatMessage(message: string): string | null {
  const normalizedMessage = sanitizeChatContent(message)

  if (!normalizedMessage) {
    return null
  }

  const emailMatch = normalizedMessage.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  )

  if (!emailMatch) {
    return null
  }

  const email = emailMatch[0].toLowerCase()
  return EMAIL_PATTERN.test(email) ? email : null
}

export function extractSubjectFromChatMessage(message: string): string | null {
  const normalizedMessage = sanitizeChatContent(message)

  if (!normalizedMessage) {
    return null
  }

  const subjectPrefixMatch = normalizedMessage.match(
    /(?:sujet|subject)\s*[:\-]\s*(.+)$/i,
  )

  if (subjectPrefixMatch?.[1]) {
    return subjectPrefixMatch[1].trim().slice(0, 140)
  }

  if (normalizedMessage.includes("@")) {
    return null
  }

  if (normalizedMessage.length >= 8 && normalizedMessage.length <= 140) {
    return normalizedMessage
  }

  return null
}

export function shouldEscalateToHuman(message: string): boolean {
  return includesKeyword(message, ESCALATION_KEYWORDS)
}

export function shouldOfferContactForm(message: string): boolean {
  return includesKeyword(message, FORM_DETAIL_KEYWORDS)
}

function getFaqReply(message: string): string {
  if (includesKeyword(message, ORDER_KEYWORDS)) {
    return "Je peux vous aider pour le suivi de commande. Si vous avez un numero de commande, ajoutez-le ici et je vous orienterai vers la bonne action."
  }

  if (includesKeyword(message, ACCOUNT_KEYWORDS)) {
    return "Pour les sujets de connexion ou mot de passe, vous pouvez utiliser la page de connexion et la reinitialisation. Je peux aussi transmettre votre demande a un agent."
  }

  if (includesKeyword(message, CATALOG_KEYWORDS)) {
    return "Pour les questions produit, je peux vous guider vers le catalogue ou vous aider a formuler une demande precise pour notre equipe."
  }

  return "Merci pour votre message. Je peux repondre aux questions frequentes ou vous mettre en relation avec un agent humain si besoin."
}

export function buildChatbotReply(params: {
  message: string
  collectedEmail?: string | null
  collectedSubject?: string | null
}): ChatbotReplyPayload {
  const normalizedMessage = sanitizeChatContent(params.message)
  const normalizedEmail = normalizeContactText(params.collectedEmail ?? "")
  const normalizedSubject = normalizeContactText(params.collectedSubject ?? "")

  const capturedEmail = extractEmailFromChatMessage(normalizedMessage)
  const capturedSubject = extractSubjectFromChatMessage(normalizedMessage)

  const nextEmail =
    capturedEmail ??
    (EMAIL_PATTERN.test(normalizedEmail) ? normalizedEmail : null)
  const nextSubject = capturedSubject ?? (normalizedSubject || null)

  if (!nextEmail) {
    return {
      reply: "Pour commencer, pouvez-vous partager votre adresse e-mail ?",
      capturedEmail: null,
      capturedSubject: nextSubject,
      escalationRecommended: false,
      actions: [],
    }
  }

  if (!nextSubject) {
    return {
      reply:
        "Merci. Quel est le sujet principal de votre demande ? Vous pouvez repondre sous la forme : Sujet: ...",
      capturedEmail: nextEmail,
      capturedSubject: null,
      escalationRecommended: false,
      actions: [],
    }
  }

  const escalationRecommended = shouldEscalateToHuman(normalizedMessage)
  const shouldOpenForm = shouldOfferContactForm(normalizedMessage)

  const actions: ChatbotActionType[] = []

  if (escalationRecommended) {
    actions.push("escalate_human")
  }

  if (shouldOpenForm || escalationRecommended) {
    actions.push("contact_form")
  }

  return {
    reply: getFaqReply(normalizedMessage),
    capturedEmail: nextEmail,
    capturedSubject: nextSubject,
    escalationRecommended,
    actions,
  }
}
