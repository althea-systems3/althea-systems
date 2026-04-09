import { getLocale, getTranslations } from "next-intl/server"

import { ContactToolsPage } from "@/features/contact/ContactToolsPage"

export default async function ChatbotPage() {
  const locale = await getLocale()
  const t = await getTranslations("Pages.chatbot")

  return (
    <ContactToolsPage
      locale={locale}
      title={t("title")}
      description={t("description")}
      initialChatOpen
    />
  )
}
