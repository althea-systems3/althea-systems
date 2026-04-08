"use client"

import { Eye, EyeOff, Loader2, Lock } from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Link, useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  AuthFormCard,
  AuthPageSection,
  AuthStatusMessage,
} from "./authFormShared"
import {
  getInitialResetPasswordFormValues,
  hasResetPasswordFormErrors,
  validateResetPasswordForm,
} from "./passwordResetValidation"
import { isStrongPassword } from "./signUpValidation"

type ResetPasswordStatus = {
  message: string
  isError: boolean
}

function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) {
    return null
  }

  const normalizedPath = nextPath.trim()

  if (!normalizedPath.startsWith("/") || normalizedPath.startsWith("//")) {
    return null
  }

  return normalizedPath
}

function appendQueryParam(path: string, key: string, value: string): string {
  const [pathname, queryString = ""] = path.split("?")
  const searchParams = new URLSearchParams(queryString)
  searchParams.set(key, value)

  const nextQueryString = searchParams.toString()

  if (!nextQueryString) {
    return pathname
  }

  return `${pathname}?${nextQueryString}`
}

function buildPathWithContext(
  basePath: string,
  nextPath: string | null,
): string {
  if (!nextPath) {
    return basePath
  }

  return appendQueryParam(basePath, "next", nextPath)
}

function getApiErrorMessageKey(errorCode: string): string {
  if (errorCode === "session_expired") {
    return "sessionExpired"
  }

  if (errorCode === "password_too_weak") {
    return "passwordTooWeak"
  }

  if (errorCode === "server_error") {
    return "serverError"
  }

  return "resetFailed"
}

export function ResetPasswordForm() {
  const translateResetPassword = useTranslations("Pages.resetPassword")
  const router = useRouter()
  const searchParams = useSearchParams()

  const recoveryStatus = searchParams.get("recovery")
  const safeNextPath = getSafeNextPath(searchParams.get("next"))

  const [resetPasswordValues, setResetPasswordValues] = useState(
    getInitialResetPasswordFormValues(),
  )
  const [touchedPasswordFields, setTouchedPasswordFields] = useState<
    Partial<Record<"password" | "passwordConfirmation", boolean>>
  >({})
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetPasswordStatus, setResetPasswordStatus] =
    useState<ResetPasswordStatus | null>(null)

  const resetPasswordErrors = useMemo(() => {
    return validateResetPasswordForm(resetPasswordValues)
  }, [resetPasswordValues])

  const hasStrongPassword = isStrongPassword(resetPasswordValues.password)
  const hasFormErrors = hasResetPasswordFormErrors(resetPasswordErrors)

  const queryFeedback = useMemo<ResetPasswordStatus | null>(() => {
    if (recoveryStatus === "expired") {
      return {
        isError: true,
        message: translateResetPassword("form.messages.tokenExpired"),
      }
    }

    if (recoveryStatus === "invalid") {
      return {
        isError: true,
        message: translateResetPassword("form.messages.tokenInvalid"),
      }
    }

    return null
  }, [recoveryStatus, translateResetPassword])

  function getFieldErrorMessage(
    fieldName: "password" | "passwordConfirmation",
  ): string | null {
    const shouldShowError =
      isSubmitAttempted || Boolean(touchedPasswordFields[fieldName])

    if (!shouldShowError) {
      return null
    }

    const fieldErrorCode = resetPasswordErrors[fieldName]

    if (!fieldErrorCode) {
      return null
    }

    if (fieldName === "password" && fieldErrorCode === "required") {
      return translateResetPassword("form.validation.passwordRequired")
    }

    if (fieldName === "password" && fieldErrorCode === "weak") {
      return translateResetPassword("form.validation.passwordWeak")
    }

    if (fieldName === "passwordConfirmation" && fieldErrorCode === "required") {
      return translateResetPassword(
        "form.validation.passwordConfirmationRequired",
      )
    }

    return translateResetPassword("form.validation.passwordsMismatch")
  }

  function markAllFieldsAsTouched() {
    setTouchedPasswordFields({
      password: true,
      passwordConfirmation: true,
    })
  }

  async function handleResetPasswordSubmit(
    formSubmitEvent: FormEvent<HTMLFormElement>,
  ) {
    formSubmitEvent.preventDefault()
    setIsSubmitAttempted(true)
    markAllFieldsAsTouched()

    if (recoveryStatus === "invalid" || recoveryStatus === "expired") {
      setResetPasswordStatus({
        isError: true,
        message: translateResetPassword("form.messages.requestNewLink"),
      })
      return
    }

    if (hasFormErrors) {
      setResetPasswordStatus({
        isError: true,
        message: translateResetPassword("form.messages.errorHint"),
      })
      return
    }

    setIsSubmitting(true)
    setResetPasswordStatus(null)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: resetPasswordValues.password,
          passwordConfirmation: resetPasswordValues.passwordConfirmation,
        }),
      })

      const responsePayload = await response.json().catch(() => null)

      if (!response.ok || !responsePayload) {
        const responseCode =
          typeof responsePayload?.code === "string"
            ? responsePayload.code
            : "reset_failed"

        setResetPasswordStatus({
          isError: true,
          message: translateResetPassword(
            `form.messages.${getApiErrorMessageKey(responseCode)}`,
          ),
        })
        return
      }

      let signInPath = appendQueryParam("/connexion", "reset", "success")

      if (safeNextPath) {
        signInPath = appendQueryParam(signInPath, "next", safeNextPath)
      }

      router.replace(signInPath)
    } catch (error) {
      console.error("Erreur reset mot de passe", { error })
      setResetPasswordStatus({
        isError: true,
        message: translateResetPassword("form.messages.serverError"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const forgotPasswordPath = buildPathWithContext(
    "/mot-de-passe-oublie",
    safeNextPath,
  )
  const signInPath = buildPathWithContext("/connexion", safeNextPath)

  const effectiveStatus = resetPasswordStatus ?? queryFeedback

  const passwordErrorMessage = getFieldErrorMessage("password")
  const passwordConfirmationErrorMessage = getFieldErrorMessage(
    "passwordConfirmation",
  )

  return (
    <AuthPageSection
      title={translateResetPassword("title")}
      description={translateResetPassword("description")}
    >
      <AuthFormCard
        title={translateResetPassword("form.title")}
        description={translateResetPassword("form.description")}
        footer={
          <AuthStatusMessage
            message={effectiveStatus?.message ?? null}
            isError={effectiveStatus?.isError ?? false}
          />
        }
      >
        <form
          className="space-y-4"
          onSubmit={handleResetPasswordSubmit}
          noValidate
        >
          <div className="space-y-1.5">
            <label
              htmlFor="reset-password"
              className="text-sm font-medium text-brand-nav"
            >
              {translateResetPassword("form.fields.password.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="reset-password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={resetPasswordValues.password}
                onChange={(changeEvent) => {
                  setResetPasswordValues((currentValue) => ({
                    ...currentValue,
                    password: changeEvent.target.value,
                  }))
                  setTouchedPasswordFields((currentValue) => ({
                    ...currentValue,
                    password: true,
                  }))

                  if (resetPasswordStatus?.isError) {
                    setResetPasswordStatus(null)
                  }
                }}
                className="ps-9 pe-11"
                placeholder={translateResetPassword(
                  "form.fields.password.placeholder",
                )}
                aria-invalid={Boolean(passwordErrorMessage)}
                aria-describedby={
                  [
                    passwordErrorMessage ? "reset-password-error" : null,
                    "reset-password-hint",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  isPasswordVisible
                    ? translateResetPassword("form.actions.hidePassword")
                    : translateResetPassword("form.actions.showPassword")
                }
                onClick={() =>
                  setIsPasswordVisible((currentValue) => !currentValue)
                }
              >
                {isPasswordVisible ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </InputGroup>
            <p id="reset-password-hint" className="text-xs text-slate-600">
              {hasStrongPassword
                ? translateResetPassword("form.messages.passwordStrong")
                : translateResetPassword("form.messages.passwordHint")}
            </p>
            {passwordErrorMessage ? (
              <p
                id="reset-password-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordErrorMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reset-password-confirmation"
              className="text-sm font-medium text-brand-nav"
            >
              {translateResetPassword("form.fields.passwordConfirmation.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="reset-password-confirmation"
                name="passwordConfirmation"
                type={isPasswordConfirmationVisible ? "text" : "password"}
                autoComplete="new-password"
                value={resetPasswordValues.passwordConfirmation}
                onChange={(changeEvent) => {
                  setResetPasswordValues((currentValue) => ({
                    ...currentValue,
                    passwordConfirmation: changeEvent.target.value,
                  }))
                  setTouchedPasswordFields((currentValue) => ({
                    ...currentValue,
                    passwordConfirmation: true,
                  }))

                  if (resetPasswordStatus?.isError) {
                    setResetPasswordStatus(null)
                  }
                }}
                className="ps-9 pe-11"
                placeholder={translateResetPassword(
                  "form.fields.passwordConfirmation.placeholder",
                )}
                aria-invalid={Boolean(passwordConfirmationErrorMessage)}
                aria-describedby={
                  passwordConfirmationErrorMessage
                    ? "reset-password-confirmation-error"
                    : undefined
                }
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  isPasswordConfirmationVisible
                    ? translateResetPassword("form.actions.hidePassword")
                    : translateResetPassword("form.actions.showPassword")
                }
                onClick={() =>
                  setIsPasswordConfirmationVisible(
                    (currentValue) => !currentValue,
                  )
                }
              >
                {isPasswordConfirmationVisible ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </InputGroup>
            {passwordConfirmationErrorMessage ? (
              <p
                id="reset-password-confirmation-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordConfirmationErrorMessage}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {translateResetPassword("form.actions.submitting")}
              </>
            ) : (
              translateResetPassword("form.actions.submit")
            )}
          </Button>

          <p className="text-center text-sm text-slate-600">
            <Link
              href={forgotPasswordPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translateResetPassword("form.actions.requestNewLink")}
            </Link>
          </p>

          <p className="text-center text-sm text-slate-600">
            <Link
              href={signInPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translateResetPassword("form.actions.goToSignIn")}
            </Link>
          </p>

          {effectiveStatus?.isError ? (
            <p className="text-xs text-brand-error" role="alert">
              {translateResetPassword("form.messages.errorHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
