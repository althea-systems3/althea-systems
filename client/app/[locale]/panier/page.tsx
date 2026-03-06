import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function CartPage() {
  const t = await getTranslations("Pages.cart")

  return <StaticPage title={t("title")} description={t("description")} />
}
