"use client"

import {
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { InputGroupInput } from "@/components/ui/input-group"
import { usePathname, useRouter } from "@/i18n/navigation"
import { secureFetch } from "@/lib/http/secureFetch"
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"
import type {
  AccountPaymentCreateForm,
  AccountPaymentEditForm,
  AccountPaymentMethod,
} from "./accountTypes"
import {
  getInitialPaymentCreateForm,
  hasFormErrors,
  maskCardLast4,
  validatePaymentCreateForm,
} from "./accountUtils"

type PaymentStatus = {
  isError: boolean
  message: string
}

function getSessionExpiredPath(pathname: string): string {
  const query = new URLSearchParams({
    reason: "session_expired",
    next: pathname,
  })

  return `/connexion?${query.toString()}`
}

function getInitialPaymentEditForm(
  paymentMethod: AccountPaymentMethod,
): AccountPaymentEditForm {
  return {
    cardHolder: paymentMethod.cardHolder,
    expiry: paymentMethod.expiry,
    isDefault: paymentMethod.isDefault,
  }
}

export function AccountPaymentMethodsSection() {
  const t = useTranslations("Account")
  const router = useRouter()
  const pathname = usePathname()

  const [paymentMethods, setPaymentMethods] = useState<AccountPaymentMethod[]>(
    [],
  )
  const [paymentCreateForm, setPaymentCreateForm] =
    useState<AccountPaymentCreateForm>(getInitialPaymentCreateForm())
  const [paymentEditForm, setPaymentEditForm] =
    useState<AccountPaymentEditForm>({
      cardHolder: "",
      expiry: "",
      isDefault: false,
    })
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<
    string | null
  >(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitAttempted, setHasSubmitAttempted] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)

  const paymentCreateErrors = useMemo(() => {
    return validatePaymentCreateForm(paymentCreateForm)
  }, [paymentCreateForm])

  const loadPaymentMethods = useCallback(async () => {
    try {
      const response = await secureFetch("/api/account/payment-methods", {
        cache: "no-store",
      })

      if (response.status === 401) {
        router.replace(getSessionExpiredPath(pathname))
        return
      }

      if (!response.ok) {
        setPaymentStatus({
          isError: true,
          message: t("payments.errors.loadFailed"),
        })
        return
      }

      const payload = await response.json().catch(() => null)
      const nextPaymentMethods = Array.isArray(payload?.paymentMethods)
        ? (payload.paymentMethods as AccountPaymentMethod[])
        : []

      setPaymentMethods(nextPaymentMethods)
    } catch (error) {
      console.error("Erreur chargement moyens paiement compte", { error })
      setPaymentStatus({
        isError: true,
        message: t("payments.errors.serverError"),
      })
    }
  }, [pathname, router, t])

  useEffect(() => {
    let isMounted = true

    const initializePaymentMethods = async () => {
      setIsLoading(true)
      setPaymentStatus(null)

      if (!isMounted) {
        return
      }

      await loadPaymentMethods()

      if (isMounted) {
        setIsLoading(false)
      }
    }

    void initializePaymentMethods()

    return () => {
      isMounted = false
    }
  }, [loadPaymentMethods])

  function handleCreateFieldChange(
    fieldName: keyof AccountPaymentCreateForm,
    value: string | boolean,
  ) {
    setPaymentCreateForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }))

    if (paymentStatus?.isError) {
      setPaymentStatus(null)
    }
  }

  function resetCreateForm() {
    setPaymentCreateForm(getInitialPaymentCreateForm())
    setHasSubmitAttempted(false)
  }

  async function handleCreatePaymentMethod(
    formSubmitEvent: FormEvent<HTMLFormElement>,
  ) {
    formSubmitEvent.preventDefault()
    setHasSubmitAttempted(true)

    if (hasFormErrors(paymentCreateErrors)) {
      setPaymentStatus({
        isError: true,
        message: t("payments.errors.validationBeforeCreate"),
      })
      return
    }

    setIsSubmitting(true)
    setPaymentStatus(null)

    try {
      const response = await secureFetch("/api/account/payment-methods", {
        method: "POST",
        body: JSON.stringify(paymentCreateForm),
      })

      if (response.status === 401) {
        router.replace(getSessionExpiredPath(pathname))
        return
      }

      if (!response.ok) {
        setPaymentStatus({
          isError: true,
          message: t("payments.errors.createFailed"),
        })
        return
      }

      await loadPaymentMethods()
      resetCreateForm()
      setPaymentStatus({
        isError: false,
        message: t("payments.success.created"),
      })
    } catch (error) {
      console.error("Erreur ajout moyen paiement compte", { error })
      setPaymentStatus({
        isError: true,
        message: t("payments.errors.serverError"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEditPaymentMethod(paymentMethod: AccountPaymentMethod) {
    setEditingPaymentMethodId(paymentMethod.id)
    setPaymentEditForm(getInitialPaymentEditForm(paymentMethod))
    setPaymentStatus(null)
  }

  function cancelEditPaymentMethod() {
    setEditingPaymentMethodId(null)
    setPaymentEditForm({
      cardHolder: "",
      expiry: "",
      isDefault: false,
    })
  }

  async function handleSavePaymentMethod(paymentMethodId: string) {
    setIsSubmitting(true)
    setPaymentStatus(null)

    try {
      const response = await secureFetch(
        `/api/account/payment-methods/${paymentMethodId}`,
        {
          method: "PATCH",
          body: JSON.stringify(paymentEditForm),
        },
      )

      if (response.status === 401) {
        router.replace(getSessionExpiredPath(pathname))
        return
      }

      if (!response.ok) {
        setPaymentStatus({
          isError: true,
          message: t("payments.errors.updateFailed"),
        })
        return
      }

      await loadPaymentMethods()
      cancelEditPaymentMethod()
      setPaymentStatus({
        isError: false,
        message: t("payments.success.updated"),
      })
    } catch (error) {
      console.error("Erreur mise a jour moyen paiement compte", { error })
      setPaymentStatus({
        isError: true,
        message: t("payments.errors.serverError"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeletePaymentMethod(paymentMethodId: string) {
    const hasConfirmedDeletion = await confirmCriticalAction({
      title: "Supprimer le moyen de paiement",
      message: t("payments.confirmDelete"),
      confirmLabel: "Supprimer",
      tone: "danger",
    })

    if (!hasConfirmedDeletion) {
      return
    }

    try {
      const response = await secureFetch(
        `/api/account/payment-methods/${paymentMethodId}`,
        {
          method: "DELETE",
        },
      )

      if (response.status === 401) {
        router.replace(getSessionExpiredPath(pathname))
        return
      }

      if (!response.ok) {
        setPaymentStatus({
          isError: true,
          message: t("payments.errors.deleteFailed"),
        })
        return
      }

      await loadPaymentMethods()

      if (editingPaymentMethodId === paymentMethodId) {
        cancelEditPaymentMethod()
      }

      setPaymentStatus({
        isError: false,
        message: t("payments.success.deleted"),
      })
    } catch (error) {
      console.error("Erreur suppression moyen paiement compte", { error })
      setPaymentStatus({
        isError: true,
        message: t("payments.errors.serverError"),
      })
    }
  }

  function getCreateFieldError(
    fieldName: keyof AccountPaymentCreateForm,
  ): string | null {
    if (!hasSubmitAttempted) {
      return null
    }

    const errorCode = paymentCreateErrors[fieldName]

    if (!errorCode) {
      return null
    }

    if (errorCode === "invalid" && fieldName === "last4") {
      return t("payments.validation.last4Invalid")
    }

    if (errorCode === "invalid" && fieldName === "expiry") {
      return t("payments.validation.expiryInvalid")
    }

    return t("payments.validation.required")
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="heading-font text-xl text-brand-nav">
          {t("payments.title")}
        </h2>
        <p className="text-sm text-slate-600">{t("payments.description")}</p>
      </header>

      {paymentStatus ? (
        <p
          className={
            paymentStatus.isError
              ? "text-sm text-brand-error"
              : "text-sm text-brand-success"
          }
          role={paymentStatus.isError ? "alert" : "status"}
        >
          {paymentStatus.message}
        </p>
      ) : null}

      <section className="rounded-xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-brand-nav">
          {t("payments.form.createTitle")}
        </h3>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={handleCreatePaymentMethod}
          noValidate
        >
          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="payment-stripe-id"
              className="text-sm font-medium text-brand-nav"
            >
              {t("payments.fields.stripePaymentId")}
            </label>
            <InputGroupInput
              id="payment-stripe-id"
              value={paymentCreateForm.stripePaymentId}
              onChange={(changeEvent) =>
                handleCreateFieldChange(
                  "stripePaymentId",
                  changeEvent.target.value,
                )
              }
              aria-invalid={Boolean(getCreateFieldError("stripePaymentId"))}
              aria-describedby={
                getCreateFieldError("stripePaymentId")
                  ? "payment-stripe-id-error"
                  : undefined
              }
            />
            {getCreateFieldError("stripePaymentId") ? (
              <p
                id="payment-stripe-id-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getCreateFieldError("stripePaymentId")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="payment-card-holder"
              className="text-sm font-medium text-brand-nav"
            >
              {t("payments.fields.cardHolder")}
            </label>
            <InputGroupInput
              id="payment-card-holder"
              value={paymentCreateForm.cardHolder}
              onChange={(changeEvent) =>
                handleCreateFieldChange("cardHolder", changeEvent.target.value)
              }
              aria-invalid={Boolean(getCreateFieldError("cardHolder"))}
              aria-describedby={
                getCreateFieldError("cardHolder")
                  ? "payment-card-holder-error"
                  : undefined
              }
            />
            {getCreateFieldError("cardHolder") ? (
              <p
                id="payment-card-holder-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getCreateFieldError("cardHolder")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="payment-last4"
              className="text-sm font-medium text-brand-nav"
            >
              {t("payments.fields.last4")}
            </label>
            <InputGroupInput
              id="payment-last4"
              inputMode="numeric"
              maxLength={4}
              value={paymentCreateForm.last4}
              onChange={(changeEvent) =>
                handleCreateFieldChange("last4", changeEvent.target.value)
              }
              aria-invalid={Boolean(getCreateFieldError("last4"))}
              aria-describedby={
                getCreateFieldError("last4") ? "payment-last4-error" : undefined
              }
            />
            {getCreateFieldError("last4") ? (
              <p
                id="payment-last4-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getCreateFieldError("last4")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="payment-expiry"
              className="text-sm font-medium text-brand-nav"
            >
              {t("payments.fields.expiry")}
            </label>
            <InputGroupInput
              id="payment-expiry"
              value={paymentCreateForm.expiry}
              onChange={(changeEvent) =>
                handleCreateFieldChange("expiry", changeEvent.target.value)
              }
              aria-invalid={Boolean(getCreateFieldError("expiry"))}
              aria-describedby={
                getCreateFieldError("expiry")
                  ? "payment-expiry-error"
                  : undefined
              }
            />
            {getCreateFieldError("expiry") ? (
              <p
                id="payment-expiry-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getCreateFieldError("expiry")}
              </p>
            ) : null}
          </div>

          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={paymentCreateForm.isDefault}
              onChange={(changeEvent) =>
                handleCreateFieldChange("isDefault", changeEvent.target.checked)
              }
              className="h-4 w-4 rounded border-border"
            />
            {t("payments.fields.isDefault")}
          </label>

          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button
              type="submit"
              className="bg-brand-cta text-white hover:bg-brand-cta/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("payments.actions.saving")}
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden="true" />
                  {t("payments.actions.add")}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={resetCreateForm}>
              {t("payments.actions.reset")}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-brand-nav">
          {t("payments.list.title")}
        </h3>

        {isLoading ? (
          <div
            className="flex items-center gap-2 text-sm text-slate-600"
            aria-live="polite"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("payments.list.loading")}
          </div>
        ) : paymentMethods.length === 0 ? (
          <p className="text-sm text-slate-600">{t("payments.list.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {paymentMethods.map((paymentMethod) => {
              const isEditingCurrent =
                editingPaymentMethodId === paymentMethod.id

              return (
                <li
                  key={paymentMethod.id}
                  className="rounded-xl border border-border p-3"
                >
                  {!isEditingCurrent ? (
                    <>
                      <p className="flex items-center gap-2 text-sm font-medium text-brand-nav">
                        <CreditCard className="size-4" aria-hidden="true" />
                        {paymentMethod.cardHolder}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {maskCardLast4(paymentMethod.last4)} -{" "}
                        {t("payments.list.expLabel")} {paymentMethod.expiry}
                      </p>
                      {paymentMethod.isDefault ? (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#10b981]/10 px-2 py-0.5 text-xs text-[#0f766e]">
                          <ShieldCheck className="size-3" aria-hidden="true" />
                          {t("payments.list.defaultBadge")}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPaymentMethod(paymentMethod)}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                          {t("payments.actions.edit")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-brand-error"
                          onClick={() =>
                            handleDeletePaymentMethod(paymentMethod.id)
                          }
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          {t("payments.actions.delete")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label
                          htmlFor={`payment-edit-holder-${paymentMethod.id}`}
                          className="text-sm font-medium text-brand-nav"
                        >
                          {t("payments.fields.label")}
                        </label>
                        <InputGroupInput
                          id={`payment-edit-holder-${paymentMethod.id}`}
                          value={paymentEditForm.cardHolder}
                          onChange={(changeEvent) =>
                            setPaymentEditForm((currentForm) => ({
                              ...currentForm,
                              cardHolder: changeEvent.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor={`payment-edit-expiry-${paymentMethod.id}`}
                          className="text-sm font-medium text-brand-nav"
                        >
                          {t("payments.fields.expiry")}
                        </label>
                        <InputGroupInput
                          id={`payment-edit-expiry-${paymentMethod.id}`}
                          value={paymentEditForm.expiry}
                          onChange={(changeEvent) =>
                            setPaymentEditForm((currentForm) => ({
                              ...currentForm,
                              expiry: changeEvent.target.value,
                            }))
                          }
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={paymentEditForm.isDefault}
                          onChange={(changeEvent) =>
                            setPaymentEditForm((currentForm) => ({
                              ...currentForm,
                              isDefault: changeEvent.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-border"
                        />
                        {t("payments.fields.isDefault")}
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-brand-cta text-white hover:bg-brand-cta/90"
                          onClick={() =>
                            handleSavePaymentMethod(paymentMethod.id)
                          }
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                              />
                              {t("payments.actions.saving")}
                            </>
                          ) : (
                            <>
                              <Save className="size-4" aria-hidden="true" />
                              {t("payments.actions.save")}
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={cancelEditPaymentMethod}
                        >
                          <X className="size-4" aria-hidden="true" />
                          {t("payments.actions.cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
