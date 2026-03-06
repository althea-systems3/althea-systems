import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function SettingsPage() {
  const t = await getTranslations("Pages.settings")

  return <StaticPage title={t("title")} description={t("description")} />
}
