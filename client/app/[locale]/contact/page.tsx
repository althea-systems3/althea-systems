import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function ContactPage() {
  const t = await getTranslations("Pages.contact")

  return <StaticPage title={t("title")} description={t("description")} />
}
