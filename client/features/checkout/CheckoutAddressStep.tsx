"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { CheckoutAddressForm } from "./checkoutTypes"
import type { CheckoutFlow } from "./useCheckoutFlow"

type CheckoutAddressStepProps = {
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

const ADDRESS_ERROR_KEYS = {
  stockConflict: "stockConflictMessage",
  selectSavedAddress: "address.errors.selectSavedAddress",
  completeRequiredFields: "address.errors.completeRequiredFields",
} as const

type AddressFieldConfig = {
  id: string
  name: keyof CheckoutAddressForm
  labelKey: string
  type?: string
  colSpan?: boolean
  optional?: boolean
}

const ADDRESS_FIELDS: AddressFieldConfig[] = [
  { id: "first-name", name: "firstName", labelKey: "address.fields.firstName" },
  { id: "last-name", name: "lastName", labelKey: "address.fields.lastName" },
  {
    id: "1",
    name: "address1",
    labelKey: "address.fields.address1",
    colSpan: true,
  },
  {
    id: "2",
    name: "address2",
    labelKey: "address.fields.address2Optional",
    colSpan: true,
    optional: true,
  },
  { id: "city", name: "city", labelKey: "address.fields.city" },
  { id: "region", name: "region", labelKey: "address.fields.region" },
  { id: "postal-code", name: "postalCode", labelKey: "address.fields.postalCode" },
  { id: "country", name: "country", labelKey: "address.fields.country" },
  {
    id: "phone",
    name: "phone",
    labelKey: "address.fields.phone",
    colSpan: true,
  },
]

export function CheckoutAddressStep({ flow }: CheckoutAddressStepProps) {
  const t = useTranslations("CheckoutPage")

  const errorMessage = flow.addressStepErrorKey
    ? t(ADDRESS_ERROR_KEYS[flow.addressStepErrorKey])
    : null

  const showNewAddressForm =
    flow.addressMode === "new" || flow.savedAddresses.length === 0

  return (
    <section className="space-y-4" aria-label={t("address.ariaLabel")}>
      {flow.authUser && flow.savedAddresses.length > 0 ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {(["saved", "new"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={flow.addressMode === mode ? "default" : "outline"}
                className={cn(
                  flow.addressMode === mode &&
                    "bg-brand-cta text-white hover:bg-brand-cta/90",
                )}
                onClick={() => flow.setAddressMode(mode)}
              >
                {t(`address.modes.${mode}`)}
              </Button>
            ))}
          </div>

          {flow.addressMode === "saved" ? (
            <fieldset
              className="space-y-2"
              aria-label={t("address.savedSelectionAriaLabel")}
            >
              {flow.savedAddresses.map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm",
                    flow.selectedAddressId === address.id
                      ? "border-brand-cta bg-brand-cta/10"
                      : "border-slate-200",
                  )}
                >
                  <input
                    type="radio"
                    name="saved-address"
                    checked={flow.selectedAddressId === address.id}
                    onChange={() => flow.setSelectedAddressId(address.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-cta"
                  />
                  <span>{formatAddressSummary(address)}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>
      ) : null}

      {showNewAddressForm ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {ADDRESS_FIELDS.map((field) => (
            <div
              key={field.name}
              className={cn(
                "space-y-1",
                field.colSpan && "sm:col-span-2",
              )}
            >
              <label
                className="text-sm font-medium text-brand-nav"
                htmlFor={`checkout-address-${field.id}`}
              >
                {t(field.labelKey)}
              </label>
              <input
                id={`checkout-address-${field.id}`}
                value={flow.addressForm[field.name]}
                onChange={(event) =>
                  flow.setAddressForm((current) => ({
                    ...current,
                    [field.name]: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
              />
              {!field.optional && flow.addressErrors[field.name] ? (
                <p className="text-xs text-brand-error">
                  {t("common.requiredField")}
                </p>
              ) : null}
            </div>
          ))}
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
          onClick={() => flow.setCurrentStep(1)}
        >
          {t("common.back")}
        </Button>
        <Button
          type="button"
          className="bg-brand-cta text-white hover:bg-brand-cta/90"
          onClick={flow.handleAddressStepContinue}
          disabled={flow.isAddressLoading}
        >
          {flow.isAddressLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            t("address.continueToPayment")
          )}
        </Button>
      </div>
    </section>
  )
}
