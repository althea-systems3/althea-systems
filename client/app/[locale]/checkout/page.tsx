import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function CheckoutPage() {
  const t = await getTranslations("Pages.checkout")

  return <StaticPage title={t("title")} description={t("description")} />
}
