"use client"

import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  UserRound,
} from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
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
  getInitialSignUpFormValues,
  hasSignUpFormErrors,
  isStrongPassword,
  type SignUpFieldErrorCode,
  type SignUpFieldName,
  validateSignUpForm,
} from "./signUpValidation"

type SignUpStatus = {
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

function getValidationMessageKey(
  fieldName: SignUpFieldName,
  errorCode: SignUpFieldErrorCode,
): string {
  if (fieldName === "firstName" && errorCode === "required") {
    return "firstNameRequired"
  }

  if (fieldName === "lastName" && errorCode === "required") {
    return "lastNameRequired"
  }

  if (fieldName === "email" && errorCode === "required") {
    return "emailRequired"
  }

  if (fieldName === "email" && errorCode === "invalid") {
    return "emailInvalid"
  }

  if (fieldName === "phone" && errorCode === "invalid") {
    return "phoneInvalid"
  }

  if (fieldName === "password" && errorCode === "required") {
    return "passwordRequired"
  }

  if (fieldName === "password" && errorCode === "weak") {
    return "passwordWeak"
  }

  if (fieldName === "passwordConfirmation" && errorCode === "required") {
    return "passwordConfirmationRequired"
  }

  if (fieldName === "passwordConfirmation" && errorCode === "mismatch") {
    return "passwordsMismatch"
  }

  return "termsRequired"
}

function getApiErrorMessageKey(errorCode: string): string {
  if (errorCode === "email_already_used") {
    return "emailAlreadyUsed"
  }

  if (errorCode === "password_too_weak") {
    return "passwordTooWeak"
  }

  if (errorCode === "server_error") {
    return "serverError"
  }

  return "signupFailed"
}

function setAuthenticatedLayoutState(): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(AUTHENTICATION_STORAGE_KEY, "true")
  window.dispatchEvent(new Event(AUTHENTICATION_UPDATED_EVENT_NAME))
}

export function SignUpForm() {
  const translateSignUp = useTranslations("Pages.signUp")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const source = searchParams.get("source")
  const verificationStatus = searchParams.get("verification")
  const safeNextPath = getSafeNextPath(searchParams.get("next"))
  const isCheckoutEntry =
    source === "checkout" ||
    safeNextPath === "/checkout" ||
    Boolean(safeNextPath?.startsWith("/checkout?"))

  const fallbackNextPath = isCheckoutEntry ? "/checkout" : "/mon-compte"
  const nextPath = safeNextPath ?? fallbackNextPath

  const [signUpFormValues, setSignUpFormValues] = useState(
    getInitialSignUpFormValues(),
  )
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<SignUpFieldName, boolean>>
  >({})
  const [hasSubmitBeenAttempted, setHasSubmitBeenAttempted] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
  const [isSignUpSubmitting, setIsSignUpSubmitting] = useState(false)
  const [signUpStatus, setSignUpStatus] = useState<SignUpStatus | null>(null)

  const signUpFormErrors = useMemo(() => {
    return validateSignUpForm(signUpFormValues)
  }, [signUpFormValues])

  const hasStrongPassword = isStrongPassword(signUpFormValues.password)
  const hasSignUpErrors = hasSignUpFormErrors(signUpFormErrors)

  const verificationFeedback = useMemo<SignUpStatus | null>(() => {
    if (verificationStatus === "success") {
      return {
        isError: false,
        message: translateSignUp("form.messages.verificationSuccess"),
      }
    }

    if (verificationStatus === "expired") {
      return {
        isError: true,
        message: translateSignUp("form.messages.verificationExpired"),
      }
    }

    if (verificationStatus === "invalid") {
      return {
        isError: true,
        message: translateSignUp("form.messages.verificationInvalid"),
      }
    }

    return null
  }, [translateSignUp, verificationStatus])

  function getFieldErrorMessage(fieldName: SignUpFieldName): string | null {
    const shouldShowError =
      hasSubmitBeenAttempted || Boolean(touchedFields[fieldName])

    if (!shouldShowError) {
      return null
    }

    const fieldErrorCode = signUpFormErrors[fieldName]

    if (!fieldErrorCode) {
      return null
    }

    return translateSignUp(
      `form.validation.${getValidationMessageKey(fieldName, fieldErrorCode)}`,
    )
  }

  function getFieldErrorId(fieldName: SignUpFieldName): string {
    return `sign-up-${fieldName}-error`
  }

  function handleFieldChange(
    fieldName: Exclude<SignUpFieldName, "acceptTerms">,
    fieldValue: string,
  ) {
    setSignUpFormValues((currentValue) => ({
      ...currentValue,
      [fieldName]: fieldValue,
    }))
    setTouchedFields((currentValue) => ({
      ...currentValue,
      [fieldName]: true,
    }))

    if (signUpStatus?.isError) {
      setSignUpStatus(null)
    }
  }

  function handleTermsChange(isAccepted: boolean) {
    setSignUpFormValues((currentValue) => ({
      ...currentValue,
      acceptTerms: isAccepted,
    }))
    setTouchedFields((currentValue) => ({
      ...currentValue,
      acceptTerms: true,
    }))

    if (signUpStatus?.isError) {
      setSignUpStatus(null)
    }
  }

  function markAllFieldsAsTouched() {
    setTouchedFields({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      passwordConfirmation: true,
      acceptTerms: true,
    })
  }

  async function handleSignUpFormSubmit(
    formSubmitEvent: FormEvent<HTMLFormElement>,
  ) {
    formSubmitEvent.preventDefault()
    setHasSubmitBeenAttempted(true)
    markAllFieldsAsTouched()

    if (hasSignUpErrors) {
      setSignUpStatus({
        isError: true,
        message: translateSignUp("form.messages.errorHint"),
      })
      return
    }

    setIsSignUpSubmitting(true)
    setSignUpStatus(null)

    try {
      const callbackUrl = new URL("/auth/confirm", window.location.origin)
      callbackUrl.searchParams.set("locale", locale)
      callbackUrl.searchParams.set("next", nextPath)
      callbackUrl.searchParams.set(
        "source",
        isCheckoutEntry ? "checkout" : "sign_up_page",
      )

      const response = await secureFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          firstName: signUpFormValues.firstName,
          lastName: signUpFormValues.lastName,
          email: signUpFormValues.email,
          phone: signUpFormValues.phone,
          password: signUpFormValues.password,
          acceptTerms: signUpFormValues.acceptTerms,
          redirectTo: callbackUrl.toString(),
          source: isCheckoutEntry ? "checkout" : "sign_up_page",
        }),
      })

      const responsePayload = await response.json().catch(() => null)

      if (!response.ok || !responsePayload) {
        const responseCode =
          typeof responsePayload?.code === "string"
            ? responsePayload.code
            : "signup_failed"

        setSignUpStatus({
          isError: true,
          message: translateSignUp(
            `form.messages.${getApiErrorMessageKey(responseCode)}`,
          ),
        })
        return
      }

      const isAuthenticated = responsePayload.isAuthenticated === true
      const requiresEmailVerification =
        responsePayload.requiresEmailVerification === true

      if (isAuthenticated && !requiresEmailVerification) {
        setAuthenticatedLayoutState()
        router.replace(nextPath)
        return
      }

      setSignUpFormValues((currentValue) => ({
        ...currentValue,
        password: "",
        passwordConfirmation: "",
      }))

      setSignUpStatus({
        isError: false,
        message: translateSignUp(
          isCheckoutEntry
            ? "form.messages.verificationEmailSentCheckout"
            : "form.messages.verificationEmailSent",
        ),
      })
    } catch (error) {
      console.error("Erreur inscription utilisateur", { error })
      setSignUpStatus({
        isError: true,
        message: translateSignUp("form.messages.serverError"),
      })
    } finally {
      setIsSignUpSubmitting(false)
    }
  }

  const signInPath = safeNextPath
    ? `/connexion?next=${encodeURIComponent(safeNextPath)}`
    : "/connexion"

  const checkoutPath = "/checkout?source=signup"

  const effectiveStatus = signUpStatus ?? verificationFeedback

  const submitLabel = isSignUpSubmitting
    ? translateSignUp("form.actions.submitting")
    : translateSignUp("form.actions.submit")

  const firstNameErrorMessage = getFieldErrorMessage("firstName")
  const lastNameErrorMessage = getFieldErrorMessage("lastName")
  const emailErrorMessage = getFieldErrorMessage("email")
  const phoneErrorMessage = getFieldErrorMessage("phone")
  const passwordErrorMessage = getFieldErrorMessage("password")
  const passwordConfirmationErrorMessage = getFieldErrorMessage(
    "passwordConfirmation",
  )
  const termsErrorMessage = getFieldErrorMessage("acceptTerms")

  const showGlobalErrorHint =
    hasSubmitBeenAttempted && hasSignUpErrors && !signUpStatus

  const hasEmailSentFeedback =
    effectiveStatus?.message ===
      translateSignUp("form.messages.verificationEmailSent") ||
    effectiveStatus?.message ===
      translateSignUp("form.messages.verificationEmailSentCheckout")

  const hasVerificationSuccessFeedback =
    effectiveStatus?.message ===
    translateSignUp("form.messages.verificationSuccess")

  const canSubmit = !isSignUpSubmitting

  function getFieldDescribedBy(
    fieldName: SignUpFieldName,
    hasAdditionalHint?: boolean,
    hintId?: string,
  ): string | undefined {
    const ids: string[] = []

    if (getFieldErrorMessage(fieldName)) {
      ids.push(getFieldErrorId(fieldName))
    }

    if (hasAdditionalHint && hintId) {
      ids.push(hintId)
    }

    if (ids.length === 0) {
      return undefined
    }

    return ids.join(" ")
  }

  return (
    <AuthPageSection
      title={translateSignUp("title")}
      description={translateSignUp("description")}
    >
      <AuthFormCard
        title={translateSignUp("form.title")}
        description={translateSignUp("form.description")}
        footer={
          <AuthStatusMessage
            message={effectiveStatus?.message ?? null}
            isError={effectiveStatus?.isError ?? false}
          />
        }
      >
        <form
          className="space-y-4"
          onSubmit={handleSignUpFormSubmit}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="sign-up-first-name"
                className="text-sm font-medium text-brand-nav"
              >
                {translateSignUp("form.fields.firstName.label")}
              </label>
              <InputGroup>
                <InputGroupInput
                  id="sign-up-first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={signUpFormValues.firstName}
                  onChange={(changeEvent) => {
                    handleFieldChange("firstName", changeEvent.target.value)
                  }}
                  className="ps-9"
                  placeholder={translateSignUp(
                    "form.fields.firstName.placeholder",
                  )}
                  aria-invalid={Boolean(firstNameErrorMessage)}
                  aria-describedby={getFieldDescribedBy("firstName")}
                />
                <InputGroupAddon
                  align="inline-start"
                  className="text-slate-500"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
              {firstNameErrorMessage ? (
                <p
                  id={getFieldErrorId("firstName")}
                  className="text-xs text-brand-error"
                  role="alert"
                >
                  {firstNameErrorMessage}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="sign-up-last-name"
                className="text-sm font-medium text-brand-nav"
              >
                {translateSignUp("form.fields.lastName.label")}
              </label>
              <InputGroup>
                <InputGroupInput
                  id="sign-up-last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={signUpFormValues.lastName}
                  onChange={(changeEvent) => {
                    handleFieldChange("lastName", changeEvent.target.value)
                  }}
                  className="ps-9"
                  placeholder={translateSignUp(
                    "form.fields.lastName.placeholder",
                  )}
                  aria-invalid={Boolean(lastNameErrorMessage)}
                  aria-describedby={getFieldDescribedBy("lastName")}
                />
                <InputGroupAddon
                  align="inline-start"
                  className="text-slate-500"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
              {lastNameErrorMessage ? (
                <p
                  id={getFieldErrorId("lastName")}
                  className="text-xs text-brand-error"
                  role="alert"
                >
                  {lastNameErrorMessage}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sign-up-email"
              className="text-sm font-medium text-brand-nav"
            >
              {translateSignUp("form.fields.email.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-email"
                name="email"
                type="email"
                autoComplete="email"
                value={signUpFormValues.email}
                onChange={(changeEvent) => {
                  handleFieldChange("email", changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignUp("form.fields.email.placeholder")}
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
              htmlFor="sign-up-phone"
              className="text-sm font-medium text-brand-nav"
            >
              {translateSignUp("form.fields.phone.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={signUpFormValues.phone}
                onChange={(changeEvent) => {
                  handleFieldChange("phone", changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignUp("form.fields.phone.placeholder")}
                aria-invalid={Boolean(phoneErrorMessage)}
                aria-describedby={getFieldDescribedBy("phone")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Phone className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            {phoneErrorMessage ? (
              <p
                id={getFieldErrorId("phone")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {phoneErrorMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sign-up-password"
              className="text-sm font-medium text-brand-nav"
            >
              {translateSignUp("form.fields.password.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={signUpFormValues.password}
                onChange={(changeEvent) => {
                  handleFieldChange("password", changeEvent.target.value)
                }}
                className="ps-9 pe-11"
                placeholder={translateSignUp(
                  "form.fields.password.placeholder",
                )}
                aria-invalid={Boolean(passwordErrorMessage)}
                aria-describedby={getFieldDescribedBy(
                  "password",
                  true,
                  "sign-up-password-hint",
                )}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  isPasswordVisible
                    ? translateSignUp("form.actions.hidePassword")
                    : translateSignUp("form.actions.showPassword")
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
            <p id="sign-up-password-hint" className="text-xs text-slate-600">
              {hasStrongPassword
                ? translateSignUp("form.messages.passwordStrong")
                : translateSignUp("form.messages.passwordHint")}
            </p>
            {passwordErrorMessage ? (
              <p
                id={getFieldErrorId("password")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordErrorMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sign-up-password-confirmation"
              className="text-sm font-medium text-brand-nav"
            >
              {translateSignUp("form.fields.passwordConfirmation.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-password-confirmation"
                name="passwordConfirmation"
                type={isPasswordConfirmationVisible ? "text" : "password"}
                autoComplete="new-password"
                value={signUpFormValues.passwordConfirmation}
                onChange={(changeEvent) => {
                  handleFieldChange(
                    "passwordConfirmation",
                    changeEvent.target.value,
                  )
                }}
                className="ps-9 pe-11"
                placeholder={translateSignUp(
                  "form.fields.passwordConfirmation.placeholder",
                )}
                aria-invalid={Boolean(passwordConfirmationErrorMessage)}
                aria-describedby={getFieldDescribedBy("passwordConfirmation")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  isPasswordConfirmationVisible
                    ? translateSignUp("form.actions.hidePassword")
                    : translateSignUp("form.actions.showPassword")
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
                id={getFieldErrorId("passwordConfirmation")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordConfirmationErrorMessage}
              </p>
            ) : null}
          </div>

          <label
            htmlFor="accept-terms"
            className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 p-3 text-sm text-slate-700"
          >
            <input
              id="accept-terms"
              name="acceptTerms"
              type="checkbox"
              checked={signUpFormValues.acceptTerms}
              onChange={(changeEvent) => {
                handleTermsChange(changeEvent.target.checked)
              }}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand-cta"
              aria-invalid={Boolean(termsErrorMessage)}
              aria-describedby={
                termsErrorMessage ? getFieldErrorId("acceptTerms") : undefined
              }
            />
            <span>{translateSignUp("form.fields.acceptTerms")}</span>
          </label>
          {termsErrorMessage ? (
            <p
              id={getFieldErrorId("acceptTerms")}
              className="text-xs text-brand-error"
              role="alert"
            >
              {termsErrorMessage}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit || isSignUpSubmitting}
          >
            {isSignUpSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {submitLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>

          <p className="text-center text-sm text-slate-600">
            {translateSignUp("form.actions.hasAccount")}{" "}
            <Link
              href={signInPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translateSignUp("form.actions.goToSignIn")}
            </Link>
          </p>

          {isCheckoutEntry ? (
            <p className="text-center text-sm text-slate-600">
              <Link
                href={checkoutPath}
                className="font-medium text-brand-cta hover:underline"
              >
                {translateSignUp("form.actions.goToCheckout")}
              </Link>
            </p>
          ) : null}

          {showGlobalErrorHint ? (
            <p className="text-xs text-brand-error">
              {translateSignUp("form.messages.errorHint")}
            </p>
          ) : null}

          {hasEmailSentFeedback || hasVerificationSuccessFeedback ? (
            <p className="text-xs text-slate-600" aria-live="polite">
              {translateSignUp("form.messages.nextStepHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
