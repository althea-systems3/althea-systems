import crypto from "crypto"
import { getFirestoreClient } from "@/lib/firebase/admin"
import {
  FIRESTORE_CHATBOT_CONVERSATIONS,
  CHATBOT_MODEL,
  CHATBOT_MAX_CONTEXT_MESSAGES,
} from "@/lib/contact/constants"
import type {
  ConversationDocument,
  ConversationMessage,
  ConversationMetadata,
} from "@/lib/chatbot/types"
import type { GroqMessage as LLMMessage } from "@/lib/chatbot/groq"

// ─── Session / create conversation ────────────────────────────────────────────
export async function getOrCreateConversation(params: {
  sessionId: string
  userId: string | null
  source?: "widget" | "page_contact"
}): Promise<{ conversationId: string; isNew: boolean; messages: ConversationMessage[] }> {
  const firestore = getFirestoreClient()

  // Try to find an active conversation for this session/user
  let query = firestore
    .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
    .where("metadata.status", "==", "active")
    .limit(1)

  if (params.userId) {
    query = query.where("user_id", "==", params.userId) as typeof query
  } else {
    query = query.where("session_id", "==", params.sessionId) as typeof query
  }

  const snapshot = await query.get()

  if (!snapshot.empty) {
    const doc = snapshot.docs[0]
    const data = doc.data() as ConversationDocument
    return {
      conversationId: doc.id,
      isNew: false,
      messages: data.message ?? [],
    }
  }

  // Create new conversation
  const conversationId = crypto.randomUUID()
  const now = new Date().toISOString()

  const metadata: ConversationMetadata = {
    status: "active",
    escalated_to_human: false,
    escalation_reason: null,
    escalation_at: null,
    assigned_admin_id: null,
    email: null,
    subject: null,
    last_model_used: CHATBOT_MODEL,
    nb_messages: 0,
    source: params.source ?? "widget",
  }

  const doc: ConversationDocument = {
    conversation_id: conversationId,
    user_id: params.userId,
    session_id: params.sessionId,
    created_at: now,
    last_message_at: now,
    message: [],
    metadata,
  }

  await firestore
    .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
    .doc(conversationId)
    .set(doc)

  return { conversationId, isNew: true, messages: [] }
}

// ─── Save exchange ─────────────────────────────────────────────────────────────
export async function saveExchange(params: {
  conversationId: string
  userMessage: string
  botMessage: string
  capturedEmail: string | null
  capturedSubject: string | null
  escalated: boolean
  escalationReason?: string
}): Promise<void> {
  const firestore = getFirestoreClient()
  const docRef = firestore
    .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
    .doc(params.conversationId)

  const snapshot = await docRef.get()
  const existing = snapshot.data() as ConversationDocument | undefined
  const existingMessages: ConversationMessage[] = existing?.message ?? []
  const now = new Date().toISOString()

  const newMessages: ConversationMessage[] = [
    { role: "user", content: params.userMessage, timestamp: now },
    { role: "bot", content: params.botMessage, timestamp: now },
  ]

  const allMessages = [...existingMessages, ...newMessages]
  const nbMessages = (existing?.metadata?.nb_messages ?? 0) + 2

  const metadataUpdate: Partial<ConversationMetadata> = {
    nb_messages: nbMessages,
    last_model_used: CHATBOT_MODEL,
  }

  if (params.capturedEmail) {
    metadataUpdate.email = params.capturedEmail
  }
  if (params.capturedSubject) {
    metadataUpdate.subject = params.capturedSubject
  }
  if (params.escalated) {
    metadataUpdate.status = "escalated"
    metadataUpdate.escalated_to_human = true
    metadataUpdate.escalation_reason = params.escalationReason ?? "bot_fallback"
    metadataUpdate.escalation_at = now
  }

  await docRef.set(
    {
      message: allMessages,
      last_message_at: now,
      metadata: metadataUpdate,
    },
    { merge: true },
  )
}

// ─── Trigger escalation ────────────────────────────────────────────────────────
export async function persistEscalation(params: {
  conversationId: string
  reason: "bot_fallback" | "user_request" | "timeout"
}): Promise<void> {
  const firestore = getFirestoreClient()
  const docRef = firestore
    .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
    .doc(params.conversationId)

  const now = new Date().toISOString()

  await docRef.set(
    {
      last_message_at: now,
      metadata: {
        status: "escalated",
        escalated_to_human: true,
        escalation_reason: params.reason,
        escalation_at: now,
      },
    },
    { merge: true },
  )
}

// ─── Get conversation ──────────────────────────────────────────────────────────
export async function getConversation(
  conversationId: string,
): Promise<ConversationDocument | null> {
  const firestore = getFirestoreClient()
  const doc = await firestore
    .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
    .doc(conversationId)
    .get()

  if (!doc.exists) return null

  return doc.data() as ConversationDocument
}

// ─── Build Claude history from Firestore messages ─────────────────────────────
export function buildClaudeHistory(messages: ConversationMessage[]): LLMMessage[] {
  // Keep last CHATBOT_MAX_CONTEXT_MESSAGES, but always include the first
  let relevant = messages
  if (messages.length > CHATBOT_MAX_CONTEXT_MESSAGES) {
    relevant = [messages[0], ...messages.slice(-(CHATBOT_MAX_CONTEXT_MESSAGES - 1))]
  }

  const history: LLMMessage[] = []

  for (const msg of relevant) {
    if (msg.role === "user") {
      history.push({ role: "user", content: msg.content })
    } else if (msg.role === "bot") {
      history.push({ role: "assistant", content: msg.content })
    }
  }

  return history
}
