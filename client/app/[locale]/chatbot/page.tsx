import { getLocale } from "next-intl/server"

import { ContactToolsPage } from "@/features/contact/ContactToolsPage"

type ChatbotPageContent = {
  title: string
  description: string
}

const CONTENT_BY_LOCALE: Record<string, ChatbotPageContent> = {
  fr: {
    title: "Chatbot Support",
    description:
      "Discutez en temps reel avec notre assistant. Vous pouvez aussi demander un transfert vers un agent humain.",
  },
  en: {
    title: "Support Chatbot",
    description:
      "Chat with our assistant in real time. You can also ask for transfer to a human agent.",
  },
  ar: {
    title: "Support Chatbot",
    description:
      "Chat with our assistant in real time. You can also ask for transfer to a human agent.",
  },
  he: {
    title: "Support Chatbot",
    description:
      "Chat with our assistant in real time. You can also ask for transfer to a human agent.",
  },
}

function getChatbotPageContent(locale: string): ChatbotPageContent {
  return CONTENT_BY_LOCALE[locale] ?? CONTENT_BY_LOCALE.fr
}

export default async function ChatbotPage() {
  const locale = await getLocale()
  const content = getChatbotPageContent(locale)

  return (
    <ContactToolsPage
      locale={locale}
      title={content.title}
      description={content.description}
      initialChatOpen
    />
  )
}
