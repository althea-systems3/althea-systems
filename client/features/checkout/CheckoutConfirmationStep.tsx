"use client"

import { Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

import type { CheckoutAddressForm } from "./checkoutTypes"
import { formatCheckoutPrice } from "./checkoutUtils"
import type { CheckoutFlow } from "./useCheckoutFlow"

type CheckoutConfirmationStepProps = {
  flow: CheckoutFlow
}

function formatAddressSummary(address: CheckoutAddressForm): string {
  const parts = [
    `${address.firstName} ${address.lastName}`.trim(),
    address.address1,
    address.address2,
    `${address.postalCode} ${address.city}`.trim(),
    address.region,
    address.country,
    address.phone,
  ]
  return parts.filter(Boolean).join(" - ")
}

function maskCard(last4: string): string {
  return `**** **** **** ${last4}`
}

const CONFIRM_ERROR_KEYS = new Set([
  "stockConflict",
  "confirmationFailed",
  "finalizeFailed",
])

export function CheckoutConfirmationStep({
  flow,
}: CheckoutConfirmationStepProps) {
  const locale = useLocale()
  const t = useTranslations("CheckoutPage")

  const errorMessage = flow.checkoutErrorKey
    ? CONFIRM_ERROR_KEYS.has(flow.checkoutErrorKey)
      ? t(`confirm.errors.${flow.checkoutErrorKey}`)
      : flow.checkoutErrorKey
    : null

  return (
    <section className="space-y-4" aria-label={t("confirm.ariaLabel")}>
      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
        <h3 className="heading-font text-base text-brand-nav">
          {t("confirm.productSummaryTitle")}
        </h3>
        <ul className="space-y-2 text-sm text-slate-700">
          {flow.cart.lines.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-b-0"
            >
              <span>
                {line.name} x {line.quantity}
              </span>
              <span className="font-semibold text-brand-nav">
                {formatCheckoutPrice(line.subtotalTtc, locale)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
        <h3 className="heading-font text-base text-brand-nav">
          {t("confirm.selectedAddressTitle")}
        </h3>
        <p className="text-sm text-slate-700">
          {formatAddressSummary(flow.effectiveAddressPreview)}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
        <h3 className="heading-font text-base text-brand-nav">
          {t("confirm.paymentMethodTitle")}
        </h3>
        <p className="text-sm text-slate-700">
          {flow.paymentPreview.cardHolder || t("confirm.cardFallback")} -{" "}
          {maskCard(flow.paymentPreview.last4)} -{" "}
          {flow.paymentPreview.expiry || "--/--"}
        </p>
      </div>

      {errorMessage ? (
        <p className="text-sm text-brand-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => flow.setCurrentStep(3)}
        >
          {t("common.back")}
        </Button>
        <Button
          type="button"
          className="bg-brand-cta text-white hover:bg-brand-cta/90"
          onClick={() => void flow.handleConfirmPurchase()}
          disabled={flow.isConfirmingOrder || flow.stockConflict}
        >
          {flow.isConfirmingOrder ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("confirm.submitting")}
            </>
          ) : (
            t("confirm.submit")
          )}
        </Button>
      </div>
    </section>
  )
}
