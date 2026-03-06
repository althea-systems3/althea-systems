import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function LegalPage() {
  const t = await getTranslations("Pages.legal")

  return <StaticPage title={t("title")} description={t("description")} />
}
