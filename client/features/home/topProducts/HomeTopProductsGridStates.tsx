"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { HOME_TOP_PRODUCTS_SKELETON_CARD_IDS } from "./topProductsConstants"

export function HomeTopProductsGridLoadingState() {
  const translateHomeTopProductsGrid = useTranslations("HomeTopProductsGrid")

  return (
    <div
      className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      aria-live="polite"
      aria-label={translateHomeTopProductsGrid("loadingLabel")}
    >
      {HOME_TOP_PRODUCTS_SKELETON_CARD_IDS.map((skeletonCardId) => (
        <Card key={skeletonCardId} className="overflow-hidden">
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

export function HomeTopProductsGridErrorState() {
  const translateHomeTopProductsGrid = useTranslations("HomeTopProductsGrid")

  return (
    <Card
      aria-live="polite"
      className="border-dashed border-red-200 bg-red-50/50"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {translateHomeTopProductsGrid("errorTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {translateHomeTopProductsGrid("errorDescription")}
      </CardContent>
    </Card>
  )
}

export function HomeTopProductsGridEmptyState() {
  const translateHomeTopProductsGrid = useTranslations("HomeTopProductsGrid")

  return (
    <Card
      aria-live="polite"
      className="border-dashed border-slate-300 bg-white"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {translateHomeTopProductsGrid("emptyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {translateHomeTopProductsGrid("emptyDescription")}
      </CardContent>
    </Card>
  )
}

export function HomeTopProductsGridFallbackDataState() {
  const translateHomeTopProductsGrid = useTranslations("HomeTopProductsGrid")

  return (
    <Card
      aria-live="polite"
      className="border-dashed border-brand-cta/40 bg-brand-cta/5"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {translateHomeTopProductsGrid("fallbackDataTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {translateHomeTopProductsGrid("fallbackDataDescription")}
      </CardContent>
    </Card>
  )
}
