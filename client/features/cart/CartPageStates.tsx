"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"

export function CartPageLoadingState() {
  const t = useTranslations("CartPage")

  return (
    <div
      aria-live="polite"
      aria-label={t("states.loadingLabel")}
      className="space-y-4"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <article
          key={`cart-line-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export function CartPageErrorState({
  onRetry,
}: {
  onRetry: () => Promise<unknown> | void
}) {
  const t = useTranslations("CartPage")

  return (
    <Card className="border-dashed border-red-200 bg-red-50/50" role="alert">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("states.errorTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700 sm:text-base">
        <p>{t("states.errorDescription")}</p>
        <Button type="button" variant="outline" onClick={() => void onRetry()}>
          {t("states.retry")}
        </Button>
      </CardContent>
    </Card>
  )
}

export function CartPageEmptyState() {
  const t = useTranslations("CartPage")

  return (
    <Card className="border-dashed border-slate-300 bg-white" role="status">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("states.emptyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700 sm:text-base">
        <p>{t("states.emptyDescription")}</p>
        <Button
          asChild
          className="bg-brand-cta text-white hover:bg-brand-cta/90"
        >
          <Link href="/recherche">{t("states.emptyCta")}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
