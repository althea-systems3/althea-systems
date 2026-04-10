"use client"

import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Link, useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { secureFetch } from "@/lib/http/secureFetch"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  AUTHENTICATION_STORAGE_KEY,
  AUTHENTICATION_UPDATED_EVENT_NAME,
} from "@/features/layout/layoutConstants"
import {
  AuthFormCard,
  AuthPageSection,
  AuthStatusMessage,
} from "./authFormShared"
import {
  getInitialSignInFormValues,
  hasSignInFormErrors,
  type SignInFieldErrorCode,
  type SignInFieldName,
  validateSignInForm,
} from "./signInValidation"

type SignInStatus = {
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

function getValidationMessageKey(
  fieldName: SignInFieldName,
  errorCode: SignInFieldErrorCode,
): string {
  if (fieldName === "email" && errorCode === "required") {
    return "emailRequired"
  }

  if (fieldName === "email" && errorCode === "invalid") {
    return "emailInvalid"
  }

  return "passwordRequired"
}

function getApiErrorMessageKey(errorCode: string): string {
  if (errorCode === "invalid_credentials") {
    return "invalidCredentials"
  }

  if (errorCode === "account_not_found") {
    return "accountNotFound"
  }

  if (errorCode === "incorrect_password") {
    return "incorrectPassword"
  }

  if (errorCode === "email_not_verified") {
    return "accountNotVerified"
  }

  if (errorCode === "session_expired") {
    return "sessionExpired"
  }

  if (errorCode === "server_error") {
    return "serverError"
  }

  if (errorCode === "challenge_unavailable") {
    return "adminTwoFactorUnavailable"
  }

  return "signInFailed"
}

function setAuthenticatedLayoutState(): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(AUTHENTICATION_STORAGE_KEY, "true")
  window.dispatchEvent(new Event(AUTHENTICATION_UPDATED_EVENT_NAME))
}

export function SignInForm() {
  const translateSignIn = useTranslations("Pages.signIn")
  const router = useRouter()
  const searchParams = useSearchParams()

  const source = searchParams.get("source")
  const reason = searchParams.get("reason")
  const resetStatus = searchParams.get("reset")
  const verificationStatus = searchParams.get("verification")
  const safeNextPath = getSafeNextPath(searchParams.get("next"))
  const isCheckoutEntry =
    source === "checkout" ||
    safeNextPath === "/checkout" ||
    Boolean(safeNextPath?.startsWith("/checkout?"))

  const sourceContext = isCheckoutEntry ? "checkout" : null
  const fallbackNextPath = isCheckoutEntry ? "/checkout" : "/mon-compte"
  const nextPath = safeNextPath ?? fallbackNextPath

  const [signInFormValues, setSignInFormValues] = useState(
    getInitialSignInFormValues(),
  )
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<SignInFieldName, boolean>>
  >({})
  const [hasSubmitBeenAttempted, setHasSubmitBeenAttempted] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isSignInSubmitting, setIsSignInSubmitting] = useState(false)
  const [signInStatus, setSignInStatus] = useState<SignInStatus | null>(null)

  const signInFormErrors = useMemo(() => {
    return validateSignInForm(signInFormValues)
  }, [signInFormValues])

  const hasSignInErrors = hasSignInFormErrors(signInFormErrors)

  const queryFeedback = useMemo<SignInStatus | null>(() => {
    if (resetStatus === "success") {
      return {
        isError: false,
        message: translateSignIn("form.messages.passwordResetSuccess"),
      }
    }

    if (verificationStatus === "success") {
      return {
        isError: false,
        message: translateSignIn("form.messages.verificationSuccess"),
      }
    }

    if (reason === "session_expired") {
      return {
        isError: true,
        message: translateSignIn("form.messages.sessionExpired"),
      }
    }

    return null
  }, [reason, resetStatus, translateSignIn, verificationStatus])

  function getFieldErrorMessage(fieldName: SignInFieldName): string | null {
    const shouldShowError =
      hasSubmitBeenAttempted || Boolean(touchedFields[fieldName])

    if (!shouldShowError) {
      return null
    }

    const fieldErrorCode = signInFormErrors[fieldName]

    if (!fieldErrorCode) {
      return null
    }

    return translateSignIn(
      `form.validation.${getValidationMessageKey(fieldName, fieldErrorCode)}`,
    )
  }

  function getFieldErrorId(fieldName: SignInFieldName): string {
    return `sign-in-${fieldName}-error`
  }

  function handleFieldChange(
    fieldName: Exclude<SignInFieldName, never>,
    fieldValue: string,
  ) {
    setSignInFormValues((currentValue) => ({
      ...currentValue,
      [fieldName]: fieldValue,
    }))
    setTouchedFields((currentValue) => ({
      ...currentValue,
      [fieldName]: true,
    }))

    if (signInStatus?.isError) {
      setSignInStatus(null)
    }
  }

  function handleRememberSessionChange(rememberSession: boolean) {
    setSignInFormValues((currentValue) => ({
      ...currentValue,
      rememberSession,
    }))
  }

  function markAllFieldsAsTouched() {
    setTouchedFields({
      email: true,
      password: true,
    })
  }

  async function handleSignInFormSubmit(
    formSubmitEvent: FormEvent<HTMLFormElement>,
  ) {
    formSubmitEvent.preventDefault()
    setHasSubmitBeenAttempted(true)
    markAllFieldsAsTouched()

    if (hasSignInErrors) {
      setSignInStatus({
        isError: true,
        message: translateSignIn("form.messages.errorHint"),
      })
      return
    }

    setIsSignInSubmitting(true)
    setSignInStatus(null)

    try {
      const response = await secureFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: signInFormValues.email,
          password: signInFormValues.password,
          rememberSession: signInFormValues.rememberSession,
        }),
      })

      const responsePayload = await response.json().catch(() => null)

      if (!response.ok || !responsePayload) {
        const responseCode =
          typeof responsePayload?.code === "string"
            ? responsePayload.code
            : "signin_failed"

        setSignInStatus({
          isError: true,
          message: translateSignIn(
            `form.messages.${getApiErrorMessageKey(responseCode)}`,
          ),
        })
        return
      }

      if (responsePayload.requiresAdminTwoFactor === true) {
        const adminVerificationPath = buildPathWithContext(
          "/connexion/admin-verification",
          nextPath,
          null,
        )

        setAuthenticatedLayoutState()
        router.replace(adminVerificationPath)
        return
      }

      setAuthenticatedLayoutState()
      router.replace(nextPath)
    } catch (error) {
      console.error("Erreur connexion utilisateur", { error })
      setSignInStatus({
        isError: true,
        message: translateSignIn("form.messages.serverError"),
      })
    } finally {
      setIsSignInSubmitting(false)
    }
  }

  const signUpPath = buildPathWithContext(
    "/inscription",
    safeNextPath,
    sourceContext,
  )
  const forgotPasswordPath = buildPathWithContext(
    "/mot-de-passe-oublie",
    safeNextPath,
    sourceContext,
  )
  const checkoutPath = "/checkout?source=signin"

  const effectiveStatus = signInStatus ?? queryFeedback

  const submitLabel = isSignInSubmitting
    ? translateSignIn("form.actions.submitting")
    : translateSignIn("form.actions.submit")

  const emailErrorMessage = getFieldErrorMessage("email")
  const passwordErrorMessage = getFieldErrorMessage("password")

  const showGlobalErrorHint =
    hasSubmitBeenAttempted && hasSignInErrors && !signInStatus

  const canSubmit = !isSignInSubmitting

  function getFieldDescribedBy(fieldName: SignInFieldName): string | undefined {
    const fieldErrorMessage = getFieldErrorMessage(fieldName)

    if (!fieldErrorMessage) {
      return undefined
    }

    return getFieldErrorId(fieldName)
  }

  return (
    <AuthPageSection
      title={translateSignIn("title")}
      description={translateSignIn("description")}
    >
      <AuthFormCard
        title={translateSignIn("form.title")}
        description={translateSignIn("form.description")}
        footer={
          <AuthStatusMessage
            message={effectiveStatus?.message ?? null}
            isError={effectiveStatus?.isError ?? false}
          />
        }
      >
        <form
          className="space-y-4"
          onSubmit={handleSignInFormSubmit}
          noValidate
        >
          <div className="space-y-1.5">
            <label
              htmlFor="sign-in-email"
              className="text-sm font-medium text-brand-nav"
            >
              {translateSignIn("form.fields.email.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-in-email"
                name="email"
                type="email"
                autoComplete="email"
                value={signInFormValues.email}
                onChange={(changeEvent) => {
                  handleFieldChange("email", changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignIn("form.fields.email.placeholder")}
                aria-invalid={Boolean(emailErrorMessage)}
                aria-describedby={getFieldDescribedBy("email")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Mail className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            {emailErrorMessage ? (
              <p
                id={getFieldErrorId("email")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {emailErrorMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sign-in-password"
              className="text-sm font-medium text-brand-nav"
            >
              {translateSignIn("form.fields.password.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-in-password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                value={signInFormValues.password}
                onChange={(changeEvent) => {
                  handleFieldChange("password", changeEvent.target.value)
                }}
                className="ps-9 pe-11"
                placeholder={translateSignIn(
                  "form.fields.password.placeholder",
                )}
                aria-invalid={Boolean(passwordErrorMessage)}
                aria-describedby={getFieldDescribedBy("password")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  isPasswordVisible
                    ? translateSignIn("form.actions.hidePassword")
                    : translateSignIn("form.actions.showPassword")
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
            {passwordErrorMessage ? (
              <p
                id={getFieldErrorId("password")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordErrorMessage}
              </p>
            ) : null}
            <p className="text-end text-sm">
              <Link
                href={forgotPasswordPath}
                className="font-medium text-brand-cta hover:underline"
              >
                {translateSignIn("form.actions.goToForgotPassword")}
              </Link>
            </p>
          </div>

          <label
            htmlFor="remember-session"
            className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 p-3 text-sm text-slate-700"
          >
            <input
              id="remember-session"
              name="remember-session"
              type="checkbox"
              checked={signInFormValues.rememberSession}
              onChange={(changeEvent) => {
                handleRememberSessionChange(changeEvent.target.checked)
              }}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand-cta"
            />
            <span>{translateSignIn("form.fields.rememberSession")}</span>
          </label>

          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit || isSignInSubmitting}
          >
            {isSignInSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {submitLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>

          <p className="text-center text-sm text-slate-600">
            {translateSignIn("form.actions.noAccount")}{" "}
            <Link
              href={signUpPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translateSignIn("form.actions.goToSignUp")}
            </Link>
          </p>

          {isCheckoutEntry ? (
            <p className="text-center text-sm text-slate-600">
              <Link
                href={checkoutPath}
                className="font-medium text-brand-cta hover:underline"
              >
                {translateSignIn("form.actions.goToCheckout")}
              </Link>
            </p>
          ) : null}

          {showGlobalErrorHint ? (
            <p className="text-xs text-brand-error">
              {translateSignIn("form.messages.errorHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
