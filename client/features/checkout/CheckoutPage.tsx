"use client"

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CreditCard,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { CheckoutAddressStep } from "./CheckoutAddressStep"
import { CheckoutAuthStep } from "./CheckoutAuthStep"
import { CheckoutConfirmationStep } from "./CheckoutConfirmationStep"
import {
  CheckoutPageBlockedState,
  CheckoutPageErrorState,
  CheckoutPageLoadingState,
} from "./CheckoutPageStates"
import { CheckoutPaymentStep } from "./CheckoutPaymentStep"
import type { CheckoutStepId } from "./checkoutTypes"
import { formatCheckoutPrice } from "./checkoutUtils"
import { useCheckoutFlow } from "./useCheckoutFlow"

type CheckoutStepDefinition = {
  id: CheckoutStepId
  label: string
  icon: typeof UserRound
}

export function CheckoutPage() {
  const locale = useLocale()
  const t = useTranslations("CheckoutPage")
  const flow = useCheckoutFlow()

  const checkoutSteps = useMemo<CheckoutStepDefinition[]>(
    () => [
      { id: 1, label: t("steps.connection"), icon: UserRound },
      { id: 2, label: t("steps.address"), icon: MapPin },
      { id: 3, label: t("steps.payment"), icon: CreditCard },
      { id: 4, label: t("steps.confirmation"), icon: ShieldCheck },
    ],
    [t],
  )

  if (flow.isCartLoading || flow.isAuthLoading) {
    return <CheckoutPageLoadingState />
  }

  if (flow.hasCartError) {
    return <CheckoutPageErrorState onRetry={() => flow.reloadCart()} />
  }

  if (flow.isCartEmpty) {
    return <CheckoutPageBlockedState />
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-font text-2xl text-brand-nav sm:text-3xl md:text-4xl">
          {t("header.title")}
        </h1>
        <p className="max-w-3xl text-sm text-slate-700 sm:text-base">
          {t("header.description")}
        </p>
      </header>

      {flow.stockConflict ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-brand-alert/40 bg-brand-alert/10 px-3 py-2 text-sm text-brand-nav"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand-alert" />
          <p>{t("stockConflictMessage")}</p>
        </div>
      ) : null}

      <nav
        aria-label={t("progress.ariaLabel")}
        className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
      >
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {checkoutSteps.map((step) => {
            const isCurrent = step.id === flow.currentStep
            const isDone = step.id < flow.currentStep
            const canSelect =
              step.id <= flow.maxReachedStep || step.id < flow.currentStep

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => flow.handleStepSelection(step.id)}
                  disabled={!canSelect}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isCurrent
                      ? "border-brand-cta bg-brand-cta/10 text-brand-nav"
                      : isDone
                        ? "border-brand-success/40 bg-brand-success/10 text-brand-nav"
                        : "border-slate-200 bg-white text-slate-600",
                    !canSelect && "cursor-not-allowed opacity-60",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2
                      className="size-4 text-brand-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <step.icon
                      className={cn(
                        "size-4",
                        isCurrent ? "text-brand-cta" : "text-slate-500",
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {t("progress.stepLabel", {
                      step: step.id,
                      label: step.label,
                    })}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="heading-font text-xl text-brand-nav">
              {flow.currentStep === 1 && t("steps.step1Title")}
              {flow.currentStep === 2 && t("steps.step2Title")}
              {flow.currentStep === 3 && t("steps.step3Title")}
              {flow.currentStep === 4 && t("steps.step4Title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {flow.currentStep === 1 ? <CheckoutAuthStep flow={flow} /> : null}
            {flow.currentStep === 2 ? (
              <CheckoutAddressStep flow={flow} />
            ) : null}
            {flow.currentStep === 3 ? (
              <CheckoutPaymentStep flow={flow} />
            ) : null}
            {flow.currentStep === 4 ? (
              <CheckoutConfirmationStep flow={flow} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm lg:sticky lg:top-24">
          <CardHeader className="pb-3">
            <CardTitle className="heading-font text-xl text-brand-nav">
              {t("cartSummary.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-700">
              {flow.cart.lines.map((line) => (
                <li
                  key={`summary-${line.id}`}
                  className="space-y-1 rounded-md border border-slate-100 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-brand-nav">{line.name}</p>
                    <p className="font-semibold text-brand-nav">
                      {formatCheckoutPrice(line.subtotalTtc, locale)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span>
                      {t("cartSummary.quantity", { quantity: line.quantity })}
                    </span>
                    {line.isAvailable && line.isStockSufficient ? (
                      <span className="inline-flex items-center gap-1 text-brand-success">
                        <Circle className="size-2 fill-brand-success text-brand-success" />
                        {t("cartSummary.available")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-brand-error">
                        <Circle className="size-2 fill-brand-error text-brand-error" />
                        {t("cartSummary.stockConflict")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-slate-100 pt-3 text-sm">
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <dt>{t("cartSummary.items")}</dt>
                <dd>{flow.cart.totalItems}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <dt>{t("cartSummary.totalHtEstimate")}</dt>
                <dd>{formatCheckoutPrice(flow.totalHtEstimate, locale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <dt>{t("cartSummary.vatEstimate")}</dt>
                <dd>{formatCheckoutPrice(flow.totalTvaEstimate, locale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-brand-nav">
                <dt className="heading-font text-base">
                  {t("cartSummary.totalTtc")}
                </dt>
                <dd className="heading-font text-lg">
                  {formatCheckoutPrice(flow.cart.totalTtc, locale)}
                </dd>
              </div>
            </dl>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void flow.reloadCart({ silent: true })}
            >
              {t("cartSummary.refresh")}
            </Button>

            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href="/panier">{t("cartSummary.backToCart")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
