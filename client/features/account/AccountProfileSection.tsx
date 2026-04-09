"use client"

import { Loader2, Save } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { usePathname, useRouter } from "@/i18n/navigation"
import type { AccountProfile } from "./accountTypes"
import {
  getInitialProfileForm,
  hasFormErrors,
  validateProfileForm,
} from "./accountUtils"

type ProfileStatus = {
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

export function AccountProfileSection() {
  const t = useTranslations("Account")
  const router = useRouter()
  const pathname = usePathname()

  const [profileForm, setProfileForm] = useState<AccountProfile>(
    getInitialProfileForm(),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSubmitAttempted, setHasSubmitAttempted] = useState(false)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null)

  const profileErrors = useMemo(() => {
    return validateProfileForm(profileForm)
  }, [profileForm])

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      setIsLoading(true)
      setProfileStatus(null)

      try {
        const response = await fetch("/api/account/profile", {
          cache: "no-store",
        })

        if (response.status === 401) {
          router.replace(getSessionExpiredPath(pathname))
          return
        }

        if (!response.ok) {
          if (isMounted) {
            setProfileStatus({
              isError: true,
              message: t("profile.errors.loadFailed"),
            })
          }
          return
        }

        const payload = await response.json().catch(() => null)

        if (!isMounted) {
          return
        }

        setProfileForm(payload?.profile ?? getInitialProfileForm())
      } catch (error) {
        console.error("Erreur chargement profil compte", { error })

        if (isMounted) {
          setProfileStatus({
            isError: true,
            message: t("profile.errors.temporaryLoadError"),
          })
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [pathname, router, t])

  function handleFieldChange(fieldName: keyof AccountProfile, value: string) {
    setProfileForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }))

    if (profileStatus?.isError) {
      setProfileStatus(null)
    }
  }

  async function handleProfileSubmit(
    formSubmitEvent: FormEvent<HTMLFormElement>,
  ) {
    formSubmitEvent.preventDefault()
    setHasSubmitAttempted(true)

    if (hasFormErrors(profileErrors)) {
      setProfileStatus({
        isError: true,
        message: t("profile.errors.validationBeforeSave"),
      })
      return
    }

    setIsSaving(true)
    setProfileStatus(null)

    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      })

      if (response.status === 401) {
        router.replace(getSessionExpiredPath(pathname))
        return
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const isEmailConflict = payload?.code === "email_already_used"

        setProfileStatus({
          isError: true,
          message: isEmailConflict
            ? t("profile.errors.emailConflict")
            : t("profile.errors.saveFailed"),
        })
        return
      }

      setProfileStatus({
        isError: false,
        message: t("profile.success.saved"),
      })
    } catch (error) {
      console.error("Erreur sauvegarde profil compte", { error })
      setProfileStatus({
        isError: true,
        message: t("profile.errors.serverError"),
      })
    } finally {
      setIsSaving(false)
    }
  }

  function getFieldErrorMessage(
    fieldName: keyof AccountProfile,
  ): string | null {
    if (!hasSubmitAttempted) {
      return null
    }

    const errorCode = profileErrors[fieldName]

    if (!errorCode) {
      return null
    }

    if (fieldName === "email" && errorCode === "invalid") {
      return t("profile.validation.emailInvalid")
    }

    if (fieldName === "phone" && errorCode === "invalid") {
      return t("profile.validation.phoneInvalid")
    }

    return t("profile.validation.required")
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-slate-600"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {t("profile.loading")}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="heading-font text-xl text-brand-nav">
          {t("profile.title")}
        </h2>
        <p className="text-sm text-slate-600">{t("profile.description")}</p>
      </header>

      {profileStatus ? (
        <p
          className={
            profileStatus.isError
              ? "text-sm text-brand-error"
              : "text-sm text-brand-success"
          }
          role={profileStatus.isError ? "alert" : "status"}
        >
          {profileStatus.message}
        </p>
      ) : null}

      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={handleProfileSubmit}
        noValidate
      >
        <div className="space-y-1.5">
          <label
            htmlFor="account-first-name"
            className="text-sm font-medium text-brand-nav"
          >
            {t("profile.fields.firstName")}
          </label>
          <InputGroup>
            <InputGroupInput
              id="account-first-name"
              name="firstName"
              value={profileForm.firstName}
              onChange={(changeEvent) =>
                handleFieldChange("firstName", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldErrorMessage("firstName"))}
              aria-describedby={
                getFieldErrorMessage("firstName")
                  ? "account-first-name-error"
                  : undefined
              }
            />
            <InputGroupAddon align="inline-end" className="text-slate-400" />
          </InputGroup>
          {getFieldErrorMessage("firstName") ? (
            <p
              id="account-first-name-error"
              className="text-xs text-brand-error"
              role="alert"
            >
              {getFieldErrorMessage("firstName")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="account-last-name"
            className="text-sm font-medium text-brand-nav"
          >
            {t("profile.fields.lastName")}
          </label>
          <InputGroup>
            <InputGroupInput
              id="account-last-name"
              name="lastName"
              value={profileForm.lastName}
              onChange={(changeEvent) =>
                handleFieldChange("lastName", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldErrorMessage("lastName"))}
              aria-describedby={
                getFieldErrorMessage("lastName")
                  ? "account-last-name-error"
                  : undefined
              }
            />
            <InputGroupAddon align="inline-end" className="text-slate-400" />
          </InputGroup>
          {getFieldErrorMessage("lastName") ? (
            <p
              id="account-last-name-error"
              className="text-xs text-brand-error"
              role="alert"
            >
              {getFieldErrorMessage("lastName")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor="account-email"
            className="text-sm font-medium text-brand-nav"
          >
            {t("profile.fields.email")}
          </label>
          <InputGroup>
            <InputGroupInput
              id="account-email"
              name="email"
              type="email"
              value={profileForm.email}
              onChange={(changeEvent) =>
                handleFieldChange("email", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldErrorMessage("email"))}
              aria-describedby={
                getFieldErrorMessage("email")
                  ? "account-email-error"
                  : undefined
              }
            />
            <InputGroupAddon align="inline-end" className="text-slate-400" />
          </InputGroup>
          {getFieldErrorMessage("email") ? (
            <p
              id="account-email-error"
              className="text-xs text-brand-error"
              role="alert"
            >
              {getFieldErrorMessage("email")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor="account-phone"
            className="text-sm font-medium text-brand-nav"
          >
            {t("profile.fields.phoneOptional")}
          </label>
          <InputGroup>
            <InputGroupInput
              id="account-phone"
              name="phone"
              value={profileForm.phone}
              onChange={(changeEvent) =>
                handleFieldChange("phone", changeEvent.target.value)
              }
              aria-invalid={Boolean(getFieldErrorMessage("phone"))}
              aria-describedby={
                getFieldErrorMessage("phone")
                  ? "account-phone-error"
                  : undefined
              }
            />
            <InputGroupAddon align="inline-end" className="text-slate-400" />
          </InputGroup>
          {getFieldErrorMessage("phone") ? (
            <p
              id="account-phone-error"
              className="text-xs text-brand-error"
              role="alert"
            >
              {getFieldErrorMessage("phone")}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-brand-cta text-white hover:bg-brand-cta/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("profile.actions.saving")}
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" />
                {t("profile.actions.save")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
