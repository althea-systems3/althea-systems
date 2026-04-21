import type { AnalyzedResponse } from "@/lib/chatbot/types"

const ESCALATION_TAG = "[ESCALADE_REQUISE]"
const EMAIL_REGEX = /\[EMAIL:([^\]]+)\]/g
const SUBJECT_REGEX = /\[SUJET:([^\]]+)\]/g

export function analyzeResponse(rawText: string): AnalyzedResponse {
  let text = rawText

  // Detect escalation
  const escalationRequired = text.includes(ESCALATION_TAG)
  text = text.replaceAll(ESCALATION_TAG, "").trim()

  // Extract email
  let capturedEmail: string | null = null
  const emailMatch = EMAIL_REGEX.exec(rawText)
  if (emailMatch) {
    capturedEmail = emailMatch[1].trim().toLowerCase()
  }
  EMAIL_REGEX.lastIndex = 0
  text = text.replaceAll(EMAIL_REGEX, "").trim()

  // Extract subject
  let capturedSubject: string | null = null
  const subjectMatch = SUBJECT_REGEX.exec(rawText)
  if (subjectMatch) {
    capturedSubject = subjectMatch[1].trim()
  }
  SUBJECT_REGEX.lastIndex = 0
  text = text.replaceAll(SUBJECT_REGEX, "").trim()

  // Remove any other leftover system tags (including multi-value like [ESCALADE_REQUISE, EMAIL:...])
  text = text.replaceAll(/\[[^\]]*\]/g, "").trim()

  // Collapse multiple blank lines
  text = text.replaceAll(/\n{3,}/g, "\n\n")

  return {
    cleanText: text,
    escalationRequired,
    capturedEmail,
    capturedSubject,
  }
}
