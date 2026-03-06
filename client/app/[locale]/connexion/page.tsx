import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function SignInPage() {
  const t = await getTranslations("Pages.signIn")

  return <StaticPage title={t("title")} description={t("description")} />
}
