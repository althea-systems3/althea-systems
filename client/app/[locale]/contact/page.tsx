import { getLocale, getTranslations } from "next-intl/server"

import { ContactToolsPage } from "@/features/contact/ContactToolsPage"

export default async function ContactPage() {
  const locale = await getLocale()
  const translateContactPage = await getTranslations("Pages.contact")

  return (
    <ContactToolsPage
      locale={locale}
      title={translateContactPage("title")}
      description={translateContactPage("description")}
    />
  )
}
