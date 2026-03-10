"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const CATEGORY_SKELETON_CARD_IDS = [
  "category-skeleton-card-1",
  "category-skeleton-card-2",
  "category-skeleton-card-3",
  "category-skeleton-card-4",
]

export function HomeCategoryGridLoadingState() {
  const translateHomeCategoryGrid = useTranslations("HomeCategoryGrid")

  return (
    <div
      className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4"
      aria-live="polite"
      aria-label={translateHomeCategoryGrid("loadingLabel")}
    >
      {CATEGORY_SKELETON_CARD_IDS.map((skeletonCardId) => (
        <Card key={skeletonCardId} className="overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <CardContent className="p-4">
            <Skeleton className="h-5 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function HomeCategoryGridErrorState() {
  const translateHomeCategoryGrid = useTranslations("HomeCategoryGrid")

  return (
    <Card
      aria-live="polite"
      className="border-dashed border-red-200 bg-red-50/50"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {translateHomeCategoryGrid("errorTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {translateHomeCategoryGrid("errorDescription")}
      </CardContent>
    </Card>
  )
}

export function HomeCategoryGridEmptyState() {
  const translateHomeCategoryGrid = useTranslations("HomeCategoryGrid")

  return (
    <Card
      aria-live="polite"
      className="border-dashed border-slate-300 bg-white"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {translateHomeCategoryGrid("emptyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {translateHomeCategoryGrid("emptyDescription")}
      </CardContent>
    </Card>
  )
}

export function HomeCategoryGridFallbackDataState() {
  const translateHomeCategoryGrid = useTranslations("HomeCategoryGrid")

  return (
    <Card
      aria-live="polite"
      className="border-dashed border-brand-cta/40 bg-brand-cta/5"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {translateHomeCategoryGrid("fallbackDataTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {translateHomeCategoryGrid("fallbackDataDescription")}
      </CardContent>
    </Card>
  )
}
