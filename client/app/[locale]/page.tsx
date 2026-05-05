import { useTranslations } from "next-intl"
import { ArrowRight, Headphones, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { HomeCarousel } from "@/features/home/carousel/HomeCarousel"
import { HomeFixedText } from "@/features/home/fixedText/HomeFixedText"
import { HomeCategoryGrid } from "@/features/home/categories/HomeCategoryGrid"
import { HomeTopProductsGrid } from "@/features/home/topProducts/HomeTopProductsGrid"

export default function LocalizedHomePage() {
  const t = useTranslations("Home")

  const valueCards = [
    {
      key: "operations",
      icon: Sparkles,
      titleKey: "valueCardOperationsTitle" as const,
      descriptionKey: "valueCardOperationsDescription" as const,
      iconBg: "bg-[#d4f4f7]",
      iconColor: "text-[#0a7490]",
    },
    {
      key: "availability",
      icon: ShieldCheck,
      titleKey: "valueCardAvailabilityTitle" as const,
      descriptionKey: "valueCardAvailabilityDescription" as const,
      iconBg: "bg-blue-100",
      iconColor: "text-brand-nav",
    },
    {
      key: "support",
      icon: Headphones,
      titleKey: "valueCardSupportTitle" as const,
      descriptionKey: "valueCardSupportDescription" as const,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-700",
    },
  ]

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

      <section className="relative overflow-hidden border-y border-slate-200 bg-gradient-to-br from-[#f0fbfc] via-white to-[#eaf3fb]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(20,184,200,0.12) 0, transparent 45%), radial-gradient(circle at 80% 80%, rgba(28,78,128,0.10) 0, transparent 50%)",
          }}
        />

        <div className="container relative py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-cta backdrop-blur">
              Althea Systems
            </span>
            <h2 className="heading-font mt-4 text-3xl leading-tight tracking-tight text-brand-nav sm:text-4xl lg:text-5xl">
              {t("valueTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-700 sm:text-lg">
              {t("valueDescription")}
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:mt-14 md:grid-cols-3">
            {valueCards.map((card) => {
              const Icon = card.icon
              return (
                <article
                  key={card.key}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-cta/30 hover:shadow-lg"
                >
                  <div
                    className={`mb-5 inline-flex size-12 items-center justify-center rounded-xl ${card.iconBg}`}
                  >
                    <Icon className={`size-6 ${card.iconColor}`} aria-hidden="true" />
                  </div>
                  <h3 className="heading-font text-lg text-brand-nav sm:text-xl">
                    {t(card.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {t(card.descriptionKey)}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="mt-12 flex justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-brand-cta px-8 text-white shadow-lg shadow-brand-cta/20 hover:bg-brand-cta/90 hover:shadow-xl"
            >
              <Link href="/catalogue" className="inline-flex items-center gap-2">
                {t("valueCta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
