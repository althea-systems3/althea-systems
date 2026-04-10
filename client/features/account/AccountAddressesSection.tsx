"use client"

import { Loader2, MapPin, Pencil, Plus, Save, Trash2, X } from "lucide-react"
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
import type { AccountAddress, AccountAddressForm } from "./accountTypes"
import {
  getInitialAddressForm,
  hasFormErrors,
  validateAddressForm,
} from "./accountUtils"

type AddressStatus = {
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

function toAddressForm(address: AccountAddress): AccountAddressForm {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
  }
}

export function AccountAddressesSection() {
  const t = useTranslations("Account")
  const router = useRouter()
  const pathname = usePathname()

  const [addresses, setAddresses] = useState<AccountAddress[]>([])
  const [addressForm, setAddressForm] = useState<AccountAddressForm>(
    getInitialAddressForm(),
  )
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitAttempted, setHasSubmitAttempted] = useState(false)
  const [addressStatus, setAddressStatus] = useState<AddressStatus | null>(null)

  const addressErrors = useMemo(() => {
    return validateAddressForm(addressForm)
  }, [addressForm])

  const isEditingAddress = Boolean(editingAddressId)

  const loadAddresses = useCallback(async () => {
    try {
      const response = await secureFetch("/api/account/addresses", {
        cache: "no-store",
      })

      if (response.status === 401) {
        router.replace(getSessionExpiredPath(pathname))
        return
      }

      if (!response.ok) {
        setAddressStatus({
          isError: true,
          message: t("addresses.errors.loadFailed"),
        })
        return
      }

      const payload = await response.json().catch(() => null)
      const nextAddresses = Array.isArray(payload?.addresses)
        ? (payload.addresses as AccountAddress[])
        : []

      setAddresses(nextAddresses)
    } catch (error) {
      console.error("Erreur chargement adresses compte", { error })
      setAddressStatus({
        isError: true,
        message: t("addresses.errors.serverError"),
      })
    }
  }, [pathname, router, t])

  useEffect(() => {
    let isMounted = true

    const initializeAddresses = async () => {
      setIsLoading(true)
      setAddressStatus(null)

      if (!isMounted) {
        return
      }

      await loadAddresses()

      if (isMounted) {
        setIsLoading(false)
      }
    }

    void initializeAddresses()

    return () => {
      isMounted = false
    }
  }, [loadAddresses])

  function resetAddressFormState() {
    setAddressForm(getInitialAddressForm())
    setEditingAddressId(null)
    setHasSubmitAttempted(false)
  }

  function handleFieldChange(
    fieldName: keyof AccountAddressForm,
    value: string,
  ) {
    setAddressForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }))

    if (addressStatus?.isError) {
      setAddressStatus(null)
    }
  }

  async function handleAddressSubmit(
    formSubmitEvent: FormEvent<HTMLFormElement>,
  ) {
    formSubmitEvent.preventDefault()
    setHasSubmitAttempted(true)

    if (hasFormErrors(addressErrors)) {
      setAddressStatus({
        isError: true,
        message: t("addresses.errors.validationBeforeSave"),
      })
      return
    }

    setIsSubmitting(true)
    setAddressStatus(null)

    try {
      const endpoint = isEditingAddress
        ? `/api/account/addresses/${editingAddressId}`
        : "/api/account/addresses"

      const method = isEditingAddress ? "PUT" : "POST"

      const response = await secureFetch(endpoint, {
        method,
        body: JSON.stringify(addressForm),
      })

      if (response.status === 401) {
        router.replace(getSessionExpiredPath(pathname))
        return
      }

      if (!response.ok) {
        setAddressStatus({
          isError: true,
          message: isEditingAddress
            ? t("addresses.errors.updateFailed")
            : t("addresses.errors.createFailed"),
        })
        return
      }

      await loadAddresses()
      resetAddressFormState()
      setAddressStatus({
        isError: false,
        message: isEditingAddress
          ? t("addresses.success.updated")
          : t("addresses.success.created"),
      })
    } catch (error) {
      console.error("Erreur sauvegarde adresse compte", { error })
      setAddressStatus({
        isError: true,
        message: t("addresses.errors.serverError"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEditAddress(address: AccountAddress) {
    setEditingAddressId(address.id)
    setAddressForm(toAddressForm(address))
    setHasSubmitAttempted(false)
    setAddressStatus(null)
  }

  async function handleDeleteAddress(addressId: string) {
    const hasConfirmedDeletion = await confirmCriticalAction({
      title: "Supprimer l'adresse",
      message: t("addresses.confirmDelete"),
      confirmLabel: "Supprimer",
      tone: "danger",
    })

    if (!hasConfirmedDeletion) {
      return
    }

    try {
      const response = await secureFetch(
        `/api/account/addresses/${addressId}`,
        {
          method: "DELETE",
        },
      )

      if (response.status === 401) {
        router.replace(getSessionExpiredPath(pathname))
        return
      }

      if (!response.ok) {
        setAddressStatus({
          isError: true,
          message: t("addresses.errors.deleteFailed"),
        })
        return
      }

      await loadAddresses()

      if (editingAddressId === addressId) {
        resetAddressFormState()
      }

      setAddressStatus({
        isError: false,
        message: t("addresses.success.deleted"),
      })
    } catch (error) {
      console.error("Erreur suppression adresse compte", { error })
      setAddressStatus({
        isError: true,
        message: t("addresses.errors.serverError"),
      })
    }
  }

  function getFieldError(fieldName: keyof AccountAddressForm): string | null {
    if (!hasSubmitAttempted) {
      return null
    }

    return addressErrors[fieldName] ? t("addresses.validation.required") : null
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="heading-font text-xl text-brand-nav">
          {t("addresses.title")}
        </h2>
        <p className="text-sm text-slate-600">{t("addresses.description")}</p>
      </header>

      {addressStatus ? (
        <p
          className={
            addressStatus.isError
              ? "text-sm text-brand-error"
              : "text-sm text-brand-success"
          }
          role={addressStatus.isError ? "alert" : "status"}
        >
          {addressStatus.message}
        </p>
      ) : null}

      <section className="rounded-xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-brand-nav">
          {isEditingAddress
            ? t("addresses.form.editTitle")
            : t("addresses.form.createTitle")}
        </h3>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={handleAddressSubmit}
          noValidate
        >
          <div className="space-y-1">
            <label
              htmlFor="address-first-name"
              className="text-sm font-medium text-brand-nav"
            >
              {t("addresses.fields.firstName")}
            </label>
            <InputGroupInput
              id="address-first-name"
              value={addressForm.firstName}
              onChange={(changeEvent) =>
                handleFieldChange("firstName", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldError("firstName"))}
              aria-describedby={
                getFieldError("firstName")
                  ? "address-first-name-error"
                  : undefined
              }
            />
            {getFieldError("firstName") ? (
              <p
                id="address-first-name-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getFieldError("firstName")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="address-last-name"
              className="text-sm font-medium text-brand-nav"
            >
              {t("addresses.fields.lastName")}
            </label>
            <InputGroupInput
              id="address-last-name"
              value={addressForm.lastName}
              onChange={(changeEvent) =>
                handleFieldChange("lastName", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldError("lastName"))}
              aria-describedby={
                getFieldError("lastName")
                  ? "address-last-name-error"
                  : undefined
              }
            />
            {getFieldError("lastName") ? (
              <p
                id="address-last-name-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getFieldError("lastName")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="address-line-1"
              className="text-sm font-medium text-brand-nav"
            >
              {t("addresses.fields.address1")}
            </label>
            <InputGroupInput
              id="address-line-1"
              value={addressForm.address1}
              onChange={(changeEvent) =>
                handleFieldChange("address1", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldError("address1"))}
              aria-describedby={
                getFieldError("address1") ? "address-line-1-error" : undefined
              }
            />
            {getFieldError("address1") ? (
              <p
                id="address-line-1-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getFieldError("address1")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="address-line-2"
              className="text-sm font-medium text-brand-nav"
            >
              {t("addresses.fields.address2Optional")}
            </label>
            <InputGroupInput
              id="address-line-2"
              value={addressForm.address2}
              onChange={(changeEvent) =>
                handleFieldChange("address2", changeEvent.target.value)
              }
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="address-city"
              className="text-sm font-medium text-brand-nav"
            >
              {t("addresses.fields.city")}
            </label>
            <InputGroupInput
              id="address-city"
              value={addressForm.city}
              onChange={(changeEvent) =>
                handleFieldChange("city", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldError("city"))}
              aria-describedby={
                getFieldError("city") ? "address-city-error" : undefined
              }
            />
            {getFieldError("city") ? (
              <p
                id="address-city-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getFieldError("city")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="address-postal-code"
              className="text-sm font-medium text-brand-nav"
            >
              {t("addresses.fields.postalCode")}
            </label>
            <InputGroupInput
              id="address-postal-code"
              value={addressForm.postalCode}
              onChange={(changeEvent) =>
                handleFieldChange("postalCode", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldError("postalCode"))}
              aria-describedby={
                getFieldError("postalCode")
                  ? "address-postal-code-error"
                  : undefined
              }
            />
            {getFieldError("postalCode") ? (
              <p
                id="address-postal-code-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getFieldError("postalCode")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="address-country"
              className="text-sm font-medium text-brand-nav"
            >
              {t("addresses.fields.country")}
            </label>
            <InputGroupInput
              id="address-country"
              value={addressForm.country}
              onChange={(changeEvent) =>
                handleFieldChange("country", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldError("country"))}
              aria-describedby={
                getFieldError("country") ? "address-country-error" : undefined
              }
            />
            {getFieldError("country") ? (
              <p
                id="address-country-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getFieldError("country")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="address-phone"
              className="text-sm font-medium text-brand-nav"
            >
              {t("addresses.fields.phone")}
            </label>
            <InputGroupInput
              id="address-phone"
              value={addressForm.phone}
              onChange={(changeEvent) =>
                handleFieldChange("phone", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldError("phone"))}
              aria-describedby={
                getFieldError("phone") ? "address-phone-error" : undefined
              }
            />
            {getFieldError("phone") ? (
              <p
                id="address-phone-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {getFieldError("phone")}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              className="bg-brand-cta text-white hover:bg-brand-cta/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("addresses.actions.saving")}
                </>
              ) : isEditingAddress ? (
                <>
                  <Save className="size-4" aria-hidden="true" />
                  {t("addresses.actions.update")}
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden="true" />
                  {t("addresses.actions.add")}
                </>
              )}
            </Button>

            {isEditingAddress ? (
              <Button
                type="button"
                variant="outline"
                onClick={resetAddressFormState}
              >
                <X className="size-4" aria-hidden="true" />
                {t("addresses.actions.cancel")}
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-brand-nav">
          {t("addresses.list.title")}
        </h3>

        {isLoading ? (
          <div
            className="flex items-center gap-2 text-sm text-slate-600"
            aria-live="polite"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("addresses.list.loading")}
          </div>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-slate-600">{t("addresses.list.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {addresses.map((address, index) => (
              <li
                key={address.id}
                className="rounded-xl border border-border p-3"
              >
                <p className="flex items-center gap-2 text-sm font-medium text-brand-nav">
                  <MapPin className="size-4" aria-hidden="true" />
                  {t("addresses.list.itemLabel", { index: index + 1 })}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {address.firstName} {address.lastName}
                </p>
                <p className="text-sm text-slate-700">{address.address1}</p>
                {address.address2 ? (
                  <p className="text-sm text-slate-700">{address.address2}</p>
                ) : null}
                <p className="text-sm text-slate-700">
                  {address.postalCode} {address.city}, {address.country}
                </p>
                <p className="text-sm text-slate-700">{address.phone}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditAddress(address)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    {t("addresses.actions.edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-brand-error"
                    onClick={() => handleDeleteAddress(address.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("addresses.actions.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
