import { getTranslations } from "next-intl/server"
import { PublicStaticPage } from "@/features/static-pages/PublicStaticPage"

export default async function AboutPage() {
  const t = await getTranslations("Pages.about")

  return (
    <PublicStaticPage
      slug="a-propos"
      fallbackTitle={t("title")}
      fallbackDescription={t("description")}
    />
  )
}
