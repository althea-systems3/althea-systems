import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function SignUpPage() {
  const t = await getTranslations("Pages.signUp")

  return <StaticPage title={t("title")} description={t("description")} />
}
