import { getTranslations } from "next-intl/server"
import { PublicStaticPage } from "@/features/static-pages/PublicStaticPage"

export default async function TermsPage() {
  const t = await getTranslations("Pages.terms")

  return (
    <PublicStaticPage
      slug="cgu"
      fallbackTitle={t("title")}
      fallbackDescription={t("description")}
    />
  )
}
