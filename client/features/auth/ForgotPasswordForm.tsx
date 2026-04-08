"use client"

import { Loader2, Mail } from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Link } from "@/i18n/navigation"
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
  getInitialForgotPasswordFormValues,
  validateForgotPasswordForm,
} from "./passwordResetValidation"

type ForgotPasswordStatus = {
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

function buildPathWithContext(
  basePath: string,
  nextPath: string | null,
  source: string | null,
): string {
  const searchParams = new URLSearchParams()

  if (nextPath) {
    searchParams.set("next", nextPath)
  }

  if (source) {
    searchParams.set("source", source)
  }

  const queryString = searchParams.toString()

  if (!queryString) {
    return basePath
  }

  return `${basePath}?${queryString}`
}

function getApiErrorMessageKey(errorCode: string): string {
  if (errorCode === "rate_limited") {
    return "rateLimited"
  }

  if (errorCode === "server_error") {
    return "serverError"
  }

  return "requestFailed"
}

export function ForgotPasswordForm() {
  const translateForgotPassword = useTranslations("Pages.forgotPassword")
  const locale = useLocale()
  const searchParams = useSearchParams()

  const source = searchParams.get("source")
  const safeNextPath = getSafeNextPath(searchParams.get("next"))
  const isCheckoutEntry =
    source === "checkout" ||
    safeNextPath === "/checkout" ||
    Boolean(safeNextPath?.startsWith("/checkout?"))

  const sourceContext = isCheckoutEntry ? "checkout" : null
  const fallbackNextPath = isCheckoutEntry ? "/checkout" : "/mon-compte"
  const nextPath = safeNextPath ?? fallbackNextPath

  const [forgotPasswordValues, setForgotPasswordValues] = useState(
    getInitialForgotPasswordFormValues(),
  )
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [forgotPasswordStatus, setForgotPasswordStatus] =
    useState<ForgotPasswordStatus | null>(null)

  const forgotPasswordErrors = useMemo(() => {
    return validateForgotPasswordForm(forgotPasswordValues)
  }, [forgotPasswordValues])

  const emailErrorMessage = useMemo(() => {
    if (!isSubmitAttempted) {
      return null
    }

    if (forgotPasswordErrors.email === "required") {
      return translateForgotPassword("form.validation.emailRequired")
    }

    if (forgotPasswordErrors.email === "invalid") {
      return translateForgotPassword("form.validation.emailInvalid")
    }

    return null
  }, [forgotPasswordErrors.email, isSubmitAttempted, translateForgotPassword])

  const signInPath = buildPathWithContext(
    "/connexion",
    safeNextPath,
    sourceContext,
  )
  const signUpPath = buildPathWithContext(
    "/inscription",
    safeNextPath,
    sourceContext,
  )
  const checkoutPath = "/checkout?source=forgot_password"

  async function handleForgotPasswordSubmit(
    formSubmitEvent: FormEvent<HTMLFormElement>,
  ) {
    formSubmitEvent.preventDefault()
    setIsSubmitAttempted(true)

    if (forgotPasswordErrors.email) {
      setForgotPasswordStatus({
        isError: true,
        message: translateForgotPassword("form.messages.errorHint"),
      })
      return
    }

    setIsSubmitting(true)
    setForgotPasswordStatus(null)

    try {
      const callbackUrl = new URL("/auth/reset", window.location.origin)
      callbackUrl.searchParams.set("locale", locale)
      callbackUrl.searchParams.set("next", nextPath)

      if (sourceContext) {
        callbackUrl.searchParams.set("source", sourceContext)
      }

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotPasswordValues.email,
          redirectTo: callbackUrl.toString(),
        }),
      })

      const responsePayload = await response.json().catch(() => null)

      if (!response.ok || !responsePayload) {
        const responseCode =
          typeof responsePayload?.code === "string"
            ? responsePayload.code
            : "request_failed"

        setForgotPasswordStatus({
          isError: true,
          message: translateForgotPassword(
            `form.messages.${getApiErrorMessageKey(responseCode)}`,
          ),
        })
        return
      }

      setForgotPasswordStatus({
        isError: false,
        message: translateForgotPassword("form.messages.emailSentNeutral"),
      })
    } catch (error) {
      console.error("Erreur demande reset password", { error })
      setForgotPasswordStatus({
        isError: true,
        message: translateForgotPassword("form.messages.serverError"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageSection
      title={translateForgotPassword("title")}
      description={translateForgotPassword("description")}
    >
      <AuthFormCard
        title={translateForgotPassword("form.title")}
        description={translateForgotPassword("form.description")}
        footer={
          <AuthStatusMessage
            message={forgotPasswordStatus?.message ?? null}
            isError={forgotPasswordStatus?.isError ?? false}
          />
        }
      >
        <form
          className="space-y-4"
          onSubmit={handleForgotPasswordSubmit}
          noValidate
        >
          <div className="space-y-1.5">
            <label
              htmlFor="forgot-password-email"
              className="text-sm font-medium text-brand-nav"
            >
              {translateForgotPassword("form.fields.email.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="forgot-password-email"
                name="email"
                type="email"
                autoComplete="email"
                value={forgotPasswordValues.email}
                onChange={(changeEvent) => {
                  setForgotPasswordValues({
                    email: changeEvent.target.value,
                  })

                  if (forgotPasswordStatus?.isError) {
                    setForgotPasswordStatus(null)
                  }
                }}
                className="ps-9"
                placeholder={translateForgotPassword(
                  "form.fields.email.placeholder",
                )}
                aria-invalid={Boolean(emailErrorMessage)}
                aria-describedby={
                  emailErrorMessage ? "forgot-password-email-error" : undefined
                }
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Mail className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            {emailErrorMessage ? (
              <p
                id="forgot-password-email-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {emailErrorMessage}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {translateForgotPassword("form.actions.submitting")}
              </>
            ) : (
              translateForgotPassword("form.actions.submit")
            )}
          </Button>

          <p className="text-center text-sm text-slate-600">
            {translateForgotPassword("form.actions.hasAccount")}{" "}
            <Link
              href={signInPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translateForgotPassword("form.actions.goToSignIn")}
            </Link>
          </p>

          <p className="text-center text-sm text-slate-600">
            {translateForgotPassword("form.actions.noAccount")}{" "}
            <Link
              href={signUpPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translateForgotPassword("form.actions.goToSignUp")}
            </Link>
          </p>

          {isCheckoutEntry ? (
            <p className="text-center text-sm text-slate-600">
              <Link
                href={checkoutPath}
                className="font-medium text-brand-cta hover:underline"
              >
                {translateForgotPassword("form.actions.goToCheckout")}
              </Link>
            </p>
          ) : null}

          {forgotPasswordStatus && !forgotPasswordStatus.isError ? (
            <p className="text-xs text-slate-600" aria-live="polite">
              {translateForgotPassword("form.messages.nextStepHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
