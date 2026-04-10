import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { HomeCarousel } from "@/features/home/carousel/HomeCarousel"
import { HomeFixedText } from "@/features/home/fixedText/HomeFixedText"
import { HomeCategoryGrid } from "@/features/home/categories/HomeCategoryGrid"
import { HomeTopProductsGrid } from "@/features/home/topProducts/HomeTopProductsGrid"

export default function LocalizedHomePage() {
  const t = useTranslations("Home")

  return (
    <>
      <section className="container py-8 sm:py-10">
        <HomeCarousel />
      </section>

      <HomeFixedText />

      <section className="container pb-10 sm:pb-14">
        <HomeCategoryGrid />
      </section>

      <section className="container pb-10 sm:pb-14">
        <HomeTopProductsGrid />
      </section>

      <section className="container pb-14 sm:pb-20">
        <h1 className="heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-700">{t("subtitle")}</p>
        <div className="mt-8">
          <Button>{t("cta")}</Button>
        </div>
      </section>
    </>
  )
}
