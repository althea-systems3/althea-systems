import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
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
        <h2 className="heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
          {t("valueTitle")}
        </h2>
        <p className="mt-3 max-w-3xl text-slate-700">{t("valueDescription")}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="heading-font text-xl text-brand-nav">
              {t("valueCardOperationsTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-700 sm:text-base">
              {t("valueCardOperationsDescription")}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="heading-font text-xl text-brand-nav">
              {t("valueCardAvailabilityTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-700 sm:text-base">
              {t("valueCardAvailabilityDescription")}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="heading-font text-xl text-brand-nav">
              {t("valueCardSupportTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-700 sm:text-base">
              {t("valueCardSupportDescription")}
            </p>
          </article>
        </div>

        <div className="mt-8">
          <Button asChild>
            <Link href="/catalogue">{t("valueCta")}</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
