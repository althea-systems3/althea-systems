import { getTranslations } from "next-intl/server"

import { HomeCategoryGrid } from "@/features/home/categories/HomeCategoryGrid"

export default async function CatalogueRootPage() {
  const t = await getTranslations("Pages.catalogue")

  return (
    <section className="container py-8 pb-14 sm:py-10 sm:pb-20">
      <header className="mb-8 max-w-3xl space-y-2">
        <h1 className="heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-sm text-slate-700 sm:text-base">
          {t("description")}
        </p>
      </header>

      <HomeCategoryGrid />
    </section>
  )
}
