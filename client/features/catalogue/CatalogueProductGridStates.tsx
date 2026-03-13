"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CATALOGUE_PRODUCTS_SKELETON_CARD_IDS } from "./catalogueConstants"

export function CatalogueProductsLoadingState() {
  const t = useTranslations("CataloguePage")

  return (
    <div
      className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4"
      aria-live="polite"
      aria-label={t("products.loadingLabel")}
    >
      {CATALOGUE_PRODUCTS_SKELETON_CARD_IDS.map((id) => (
        <Card key={id} className="overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function CatalogueProductsErrorState() {
  const t = useTranslations("CataloguePage")

  return (
    <Card
      aria-live="polite"
      className="border-dashed border-red-200 bg-red-50/50"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("products.errorTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {t("products.errorDescription")}
      </CardContent>
    </Card>
  )
}

export function CatalogueProductsEmptyState() {
  const t = useTranslations("CataloguePage")

  return (
    <Card
      aria-live="polite"
      className="border-dashed border-slate-300 bg-white"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("products.emptyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {t("products.emptyDescription")}
      </CardContent>
    </Card>
  )
}
