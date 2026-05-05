import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_LOGS_ACTIVITE } from "@/lib/carousel/constants"

export type ChatbotLogAction =
  | "chatbot_session_created"
  | "chatbot_message_sent"
  | "chatbot_escalation"
  | "chatbot_injection_detected"
  | "chatbot_rate_limit_hit"
  | "chatbot_api_error"
  | "chatbot_resolved"
  | "chatbot_assigned"
  | "chatbot_knowledge_updated"

const LOG_CHATBOT_ACTIVITY_TIMEOUT_MS = 3000

export async function logChatbotActivity(
  action: ChatbotLogAction,
  details: {
    conversation_id?: string
    user_id?: string | null
    [key: string]: unknown
  },
): Promise<void> {
  try {
    const firestore = getFirestoreClient()

    const writePromise = firestore.collection(FIRESTORE_LOGS_ACTIVITE).add({
      action,
      conversation_id: details.conversation_id ?? null,
      user_id: details.user_id ?? null,
      // Never log message content — only metadata
      details: Object.fromEntries(
        Object.entries(details).filter(
          ([k]) =>
            !["message", "content", "text", "user_id", "conversation_id"].includes(k),
        ),
      ),
      timestamp: new Date().toISOString(),
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("logChatbotActivity timeout")),
        LOG_CHATBOT_ACTIVITY_TIMEOUT_MS,
      )
    })

    await Promise.race([writePromise, timeoutPromise])
  } catch (error) {
    console.error("Erreur journalisation activité chatbot", {
      action,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
