"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SearchNoCriteriaState() {
  const t = useTranslations("SearchPage")

  return (
    <Card className="border-dashed border-slate-300 bg-white" role="status">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("states.noCriteriaTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-700 sm:text-base">
        <p>{t("states.noCriteriaDescription")}</p>
        <p>{t("states.noCriteriaHint")}</p>
      </CardContent>
    </Card>
  )
}

export function SearchLoadingState() {
  const t = useTranslations("SearchPage")

  return (
    <div
      aria-live="polite"
      aria-label={t("states.loadingLabel")}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <article
          key={`search-product-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </article>
      ))}
    </div>
  )
}

export function SearchEmptyState() {
  const t = useTranslations("SearchPage")

  return (
    <Card className="border-dashed border-slate-300 bg-white" role="status">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("states.emptyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {t("states.emptyDescription")}
      </CardContent>
    </Card>
  )
}

export function SearchErrorState() {
  const t = useTranslations("SearchPage")

  return (
    <Card className="border-dashed border-red-200 bg-red-50/50" role="alert">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("states.errorTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {t("states.errorDescription")}
      </CardContent>
    </Card>
  )
}

export function SearchPartialDataNotice() {
  const t = useTranslations("SearchPage")

  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-brand-alert/40 bg-brand-alert/10 px-3 py-2 text-sm text-brand-nav"
      role="status"
      aria-live="polite"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand-alert" />
      <p>{t("states.partialDataNotice")}</p>
    </div>
  )
}
