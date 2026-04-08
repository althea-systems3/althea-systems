import { describe, expect, it } from "vitest"

import {
  buildChatbotReply,
  extractEmailFromChatMessage,
  extractSubjectFromChatMessage,
  shouldEscalateToHuman,
} from "@/lib/contact/chatbot"

describe("chatbotUtils", () => {
  it("extrait un e-mail depuis un message utilisateur", () => {
    expect(
      extractEmailFromChatMessage("Mon email est client@example.com"),
    ).toBe("client@example.com")
  })

  it("extrait un sujet prefixe", () => {
    expect(
      extractSubjectFromChatMessage("Sujet: Probleme de paiement Stripe"),
    ).toBe("Probleme de paiement Stripe")
  })

  it("detecte une demande d escalade humaine", () => {
    expect(shouldEscalateToHuman("Je veux parler a un agent humain")).toBe(true)
  })

  it("demande l e-mail si aucun e-mail capture", () => {
    const reply = buildChatbotReply({
      message: "Bonjour",
      collectedEmail: null,
      collectedSubject: null,
    })

    expect(reply.reply.toLowerCase()).toContain("adresse e-mail")
    expect(reply.capturedEmail).toBeNull()
  })

  it("propose une action de transfert humain sur demande complexe", () => {
    const reply = buildChatbotReply({
      message: "C est urgent, je veux un agent humain",
      collectedEmail: "client@example.com",
      collectedSubject: "Incident production",
    })

    expect(reply.actions).toContain("escalate_human")
    expect(reply.actions).toContain("contact_form")
  })
})
