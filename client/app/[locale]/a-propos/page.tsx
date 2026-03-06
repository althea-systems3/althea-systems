import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function AboutPage() {
  const t = await getTranslations("Pages.about")

  return <StaticPage title={t("title")} description={t("description")} />
}
