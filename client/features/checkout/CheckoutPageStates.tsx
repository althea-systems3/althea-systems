"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"

export function CheckoutPageLoadingState() {
  const t = useTranslations("CheckoutPageStates")

  return (
    <div
      aria-live="polite"
      aria-label={t("loading.ariaLabel")}
      className="space-y-4"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <article
          key={`checkout-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </article>
      ))}
    </div>
  )
}

export function CheckoutPageErrorState({
  onRetry,
}: {
  onRetry: () => Promise<unknown> | void
}) {
  const t = useTranslations("CheckoutPageStates")

  return (
    <Card className="border-dashed border-red-200 bg-red-50/50" role="alert">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">{t("error.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700 sm:text-base">
        <p>{t("error.description")}</p>
        <Button type="button" variant="outline" onClick={() => void onRetry()}>
          {t("error.retry")}
        </Button>
      </CardContent>
    </Card>
  )
}

export function CheckoutPageBlockedState() {
  const t = useTranslations("CheckoutPageStates")

  return (
    <Card className="border-dashed border-slate-300 bg-white" role="status">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">{t("blocked.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700 sm:text-base">
        <p>{t("blocked.description")}</p>
        <Button
          asChild
          className="bg-brand-cta text-white hover:bg-brand-cta/90"
        >
          <Link href="/panier">{t("blocked.backToCart")}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
