import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

export default async function OrdersPage() {
  const t = await getTranslations("Pages.orders")

  return <StaticPage title={t("title")} description={t("description")} />
}
