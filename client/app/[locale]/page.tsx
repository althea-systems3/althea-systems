import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export default function LocalizedHomePage() {
  const t = useTranslations("Home")

  return (
    <section className="container py-14 sm:py-20">
      <h1 className="heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-700">{t("subtitle")}</p>
      <div className="mt-8">
        <Button>{t("cta")}</Button>
      </div>
    </section>
  )
}
