"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { CheckoutFlow } from "./useCheckoutFlow"

type CheckoutPaymentStepProps = {
  flow: CheckoutFlow
}

function maskCard(last4: string): string {
  return `**** **** **** ${last4}`
}

function formatCardNumber(input: string): string {
  // Garde uniquement les chiffres, max 19 (Maestro) sinon 16
  const digits = input.replace(/\D/g, "").slice(0, 19)
  // Groupe par 4
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
}

function formatExpiry(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 4)
  if (digits.length < 3) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function formatCvc(input: string): string {
  return input.replace(/\D/g, "").slice(0, 4)
}

const PAYMENT_ERROR_KEYS = {
  stockConflict: "stockConflictMessage",
  selectSavedMethod: "payment.errors.selectSavedMethod",
  invalidCardInformation: "payment.errors.invalidCardInformation",
} as const

export function CheckoutPaymentStep({ flow }: CheckoutPaymentStepProps) {
  const t = useTranslations("CheckoutPage")

  const errorMessage = flow.paymentStepErrorKey
    ? t(PAYMENT_ERROR_KEYS[flow.paymentStepErrorKey])
    : null

  const showNewPaymentForm =
    flow.paymentMode === "new" || flow.savedPaymentMethods.length === 0

  return (
    <section className="space-y-4" aria-label={t("payment.ariaLabel")}>
      {flow.authUser && flow.savedPaymentMethods.length > 0 ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {(["saved", "new"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={flow.paymentMode === mode ? "default" : "outline"}
                className={cn(
                  flow.paymentMode === mode &&
                    "bg-brand-cta text-white hover:bg-brand-cta/90",
                )}
                onClick={() => flow.setPaymentMode(mode)}
              >
                {t(`payment.modes.${mode}`)}
              </Button>
            ))}
          </div>

          {flow.paymentMode === "saved" ? (
            <fieldset
              className="space-y-2"
              aria-label={t("payment.savedSelectionAriaLabel")}
            >
              {flow.savedPaymentMethods.map((payment) => (
                <label
                  key={payment.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm",
                    flow.selectedPaymentMethodId === payment.id
                      ? "border-brand-cta bg-brand-cta/10"
                      : "border-slate-200",
                  )}
                >
                  <input
                    type="radio"
                    name="saved-payment-method"
                    checked={flow.selectedPaymentMethodId === payment.id}
                    onChange={() => flow.setSelectedPaymentMethodId(payment.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-cta"
                  />
                  <span>
                    {payment.cardHolder} - {maskCard(payment.last4)} -{" "}
                    {payment.expiry}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>
      ) : null}

      {showNewPaymentForm ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label
              className="text-sm font-medium text-brand-nav"
              htmlFor="checkout-payment-card-holder"
            >
              {t("payment.fields.cardHolder")}
            </label>
            <input
              id="checkout-payment-card-holder"
              value={flow.paymentForm.cardHolder}
              onChange={(event) =>
                flow.setPaymentForm((current) => ({
                  ...current,
                  cardHolder: event.target.value,
                }))
              }
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
            />
            {flow.paymentErrors.cardHolder ? (
              <p className="text-xs text-brand-error">
                {t("common.requiredField")}
              </p>
            ) : null}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label
              className="text-sm font-medium text-brand-nav"
              htmlFor="checkout-payment-card-number"
            >
              {t("payment.fields.cardNumber")}
            </label>
            <input
              id="checkout-payment-card-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={flow.paymentForm.cardNumber}
              maxLength={23}
              onChange={(event) =>
                flow.setPaymentForm((current) => ({
                  ...current,
                  cardNumber: formatCardNumber(event.target.value),
                }))
              }
              className="h-10 w-full rounded-md border border-border bg-white px-3 font-mono text-sm tracking-wider text-slate-700"
              placeholder="1234 5678 9012 3456"
            />
            {flow.paymentErrors.cardNumber ? (
              <p className="text-xs text-brand-error">
                {t("payment.validation.cardNumberInvalid")}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label
              className="text-sm font-medium text-brand-nav"
              htmlFor="checkout-payment-expiry"
            >
              {t("payment.fields.expiry")}
            </label>
            <input
              id="checkout-payment-expiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={flow.paymentForm.expiry}
              maxLength={5}
              onChange={(event) =>
                flow.setPaymentForm((current) => ({
                  ...current,
                  expiry: formatExpiry(event.target.value),
                }))
              }
              className="h-10 w-full rounded-md border border-border bg-white px-3 font-mono text-sm text-slate-700"
              placeholder="MM/AA"
            />
            {flow.paymentErrors.expiry ? (
              <p className="text-xs text-brand-error">
                {t("payment.validation.expiryInvalid")}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label
              className="text-sm font-medium text-brand-nav"
              htmlFor="checkout-payment-cvc"
            >
              CVC
            </label>
            <input
              id="checkout-payment-cvc"
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={flow.paymentForm.cvc}
              maxLength={4}
              onChange={(event) =>
                flow.setPaymentForm((current) => ({
                  ...current,
                  cvc: formatCvc(event.target.value),
                }))
              }
              className="h-10 w-full rounded-md border border-border bg-white px-3 font-mono text-sm text-slate-700"
              placeholder="123"
            />
            {flow.paymentErrors.cvc ? (
              <p className="text-xs text-brand-error">
                {t("payment.validation.cvcInvalid")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-brand-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => flow.setCurrentStep(2)}
        >
          {t("common.back")}
        </Button>
        <Button
          type="button"
          className="bg-brand-cta text-white hover:bg-brand-cta/90"
          onClick={flow.handlePaymentStepContinue}
          disabled={flow.isPaymentLoading}
        >
          {flow.isPaymentLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            t("payment.continueToConfirmation")
          )}
        </Button>
      </div>
    </section>
  )
}
