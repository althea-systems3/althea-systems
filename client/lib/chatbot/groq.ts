import Groq from "groq-sdk"
import { CHATBOT_MODEL } from "@/lib/contact/constants"

let cachedClient: Groq | null = null

function getClient(): Groq {
  if (!cachedClient) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error("Variable d'environnement GROQ_API_KEY manquante.")
    }
    cachedClient = new Groq({ apiKey })
  }
  return cachedClient
}

export type GroqMessage = {
  role: "user" | "assistant"
  content: string
}

export async function callGroq(
  systemPrompt: string,
  history: GroqMessage[],
  newMessage: string,
): Promise<string> {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: CHATBOT_MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: newMessage },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("Réponse Groq vide ou inattendue.")
  }

  return content
}

export async function* streamGroq(
  systemPrompt: string,
  history: GroqMessage[],
  newMessage: string,
): AsyncGenerator<string> {
  const client = getClient()

  const stream = await client.chat.completions.create({
    model: CHATBOT_MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: newMessage },
    ],
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      yield delta
    }
  }
}
