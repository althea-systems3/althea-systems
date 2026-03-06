import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function TermsPage() {
  const t = await getTranslations("Pages.terms")

  return <StaticPage title={t("title")} description={t("description")} />
}
