export const FIRESTORE_CHATBOT_CONVERSATIONS = "ConversationsChatBot"
export const FIRESTORE_CHATBOT_KNOWLEDGE = "BaseConnaissancesChatBot"

export const CONTACT_MAX_SUBJECT_LENGTH = 140
export const CONTACT_MAX_MESSAGE_LENGTH = 4000

export const CHATBOT_MAX_MESSAGE_LENGTH = 1000
export const CHATBOT_RATE_LIMIT_PER_MINUTE = 20
export const CHATBOT_RATE_LIMIT_PER_HOUR = 200
export const CHATBOT_MAX_CONTEXT_MESSAGES = 20
export const CHATBOT_MAX_KNOWLEDGE_TOKENS = 3000
export const CHATBOT_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant"
