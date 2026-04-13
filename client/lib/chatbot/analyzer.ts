import type { AnalyzedResponse } from "@/lib/chatbot/types"

const ESCALATION_TAG = "[ESCALADE_REQUISE]"
const EMAIL_REGEX = /\[EMAIL:([^\]]+)\]/g
const SUBJECT_REGEX = /\[SUJET:([^\]]+)\]/g
// Remove any remaining [TAG:...] or [TAG] patterns
const SYSTEM_TAG_REGEX = /\[[A-Z_]+(?::[^\]]+)?\]/g

export function analyzeResponse(rawText: string): AnalyzedResponse {
  let text = rawText

  // Detect escalation
  const escalationRequired = text.includes(ESCALATION_TAG)
  text = text.replace(ESCALATION_TAG, "").trim()

  // Extract email
  let capturedEmail: string | null = null
  const emailMatch = EMAIL_REGEX.exec(rawText)
  if (emailMatch) {
    capturedEmail = emailMatch[1].trim().toLowerCase()
  }
  text = text.replace(EMAIL_REGEX, "").trim()

  // Extract subject
  let capturedSubject: string | null = null
  const subjectMatch = SUBJECT_REGEX.exec(rawText)
  if (subjectMatch) {
    capturedSubject = subjectMatch[1].trim()
  }
  text = text.replace(SUBJECT_REGEX, "").trim()

  // Remove any other leftover system tags
  text = text.replace(SYSTEM_TAG_REGEX, "").trim()

  // Collapse multiple blank lines
  text = text.replace(/\n{3,}/g, "\n\n")

  return {
    cleanText: text,
    escalationRequired,
    capturedEmail,
    capturedSubject,
  }
}
