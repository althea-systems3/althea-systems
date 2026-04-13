export type KnowledgeCategory =
  | "faq"
  | "navigation"
  | "politique"
  | "compte"
  | "produit"

export type KnowledgeBlock = {
  doc_id: string
  categorie: KnowledgeCategory
  titre: string
  contenu: string
  mots_cles: string[]
  actif: boolean
  updated_at: string
}

export type ConversationStatus =
  | "active"
  | "escalated"
  | "resolved"
  | "abandoned"

export type ConversationMessage = {
  role: "user" | "bot"
  content: string
  timestamp: string
}

export type ConversationMetadata = {
  status: ConversationStatus
  escalated_to_human: boolean
  escalation_reason: string | null
  escalation_at: string | null
  assigned_admin_id: string | null
  email: string | null
  subject: string | null
  last_model_used: string
  nb_messages: number
  source: "widget" | "page_contact"
}

export type ConversationDocument = {
  conversation_id: string
  user_id: string | null
  session_id: string
  created_at: string
  last_message_at: string
  message: ConversationMessage[]
  metadata: ConversationMetadata
}

export type UserContext = {
  isAuthenticated: boolean
  nom?: string
  email?: string
  nb_commandes?: number
  statut?: string
}

export type AnalyzedResponse = {
  cleanText: string
  escalationRequired: boolean
  capturedEmail: string | null
  capturedSubject: string | null
}
