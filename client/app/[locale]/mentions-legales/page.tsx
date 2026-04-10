import { getTranslations } from "next-intl/server"
import { PublicStaticPage } from "@/features/static-pages/PublicStaticPage"

export default async function LegalPage() {
  const t = await getTranslations("Pages.legal")

  return (
    <PublicStaticPage
      slug="mentions-legales"
      fallbackTitle={t("title")}
      fallbackDescription={t("description")}
    />
  )
}
