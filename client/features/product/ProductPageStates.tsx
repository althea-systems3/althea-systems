"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProductPageLoadingState() {
  const t = useTranslations("ProductPage")

  return (
    <div
      aria-live="polite"
      aria-label={t("loadingLabel")}
      className="space-y-8"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-8">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />

        <div className="space-y-4">
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={`similar-skeleton-${index}`}
              className="h-64 w-full"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProductPageErrorState() {
  const t = useTranslations("ProductPage")

  return (
    <Card className="border-dashed border-red-200 bg-red-50/50" role="alert">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">{t("errorTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {t("errorDescription")}
      </CardContent>
    </Card>
  )
}

export function ProductPageNotFoundState() {
  const t = useTranslations("ProductPage")

  return (
    <Card className="border-dashed border-slate-300 bg-white" role="alert">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">{t("notFoundTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {t("notFoundDescription")}
      </CardContent>
    </Card>
  )
}
