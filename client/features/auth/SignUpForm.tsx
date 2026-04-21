"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  UserRound,
} from "lucide-react"
import { useMemo, useState } from "react"
import { type FieldPath, useForm } from "react-hook-form"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  AUTHENTICATION_STORAGE_KEY,
  AUTHENTICATION_UPDATED_EVENT_NAME,
} from "@/features/layout/layoutConstants"
import { Link, useRouter } from "@/i18n/navigation"
import { secureFetch } from "@/lib/http/secureFetch"
import {
  signUpFormSchema,
  type SignUpFormInput,
} from "@/lib/validation/authSchemas"

import {
  AuthFormCard,
  AuthPageSection,
  AuthStatusMessage,
} from "./authFormShared"
import { isStrongPassword } from "./signUpValidation"

type SignUpStatus = {
  message: string
  isError: boolean
}

function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) return null
  const normalized = nextPath.trim()
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null
  return normalized
}

const API_ERROR_KEYS: Record<string, string> = {
  email_already_used: "emailAlreadyUsed",
  password_too_weak: "passwordTooWeak",
  configuration_missing: "configurationUnavailable",
  server_error: "serverError",
}

function getApiErrorMessageKey(errorCode: string): string {
  return API_ERROR_KEYS[errorCode] ?? "signupFailed"
}

function setAuthenticatedLayoutState(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(AUTHENTICATION_STORAGE_KEY, "true")
  window.dispatchEvent(new Event(AUTHENTICATION_UPDATED_EVENT_NAME))
}

const VALIDATION_MESSAGE_MAP: Record<string, string> = {
  "Prénom requis.": "firstNameRequired",
  "Nom requis.": "lastNameRequired",
  "Email requis.": "emailRequired",
  "Format email invalide.": "emailInvalid",
  "Format téléphone invalide.": "phoneInvalid",
  "Mot de passe requis.": "passwordRequired",
  "Les mots de passe ne correspondent pas.": "passwordsMismatch",
  "Vous devez accepter les conditions générales.": "termsRequired",
}

export function SignUpForm() {
  const translate = useTranslations("Pages.signUp")
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
  const nextPath = safeNextPath ?? (isCheckoutEntry ? "/checkout" : "/mon-compte")

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<SignUpFormInput>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      passwordConfirmation: "",
      acceptTerms: false as unknown as true,
    },
    mode: "onTouched",
  })

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
  const [status, setStatus] = useState<SignUpStatus | null>(null)

  const passwordValue = watch("password")
  const hasStrongPassword = isStrongPassword(passwordValue ?? "")

  const verificationFeedback = useMemo<SignUpStatus | null>(() => {
    if (verificationStatus === "success") {
      return {
        isError: false,
        message: translate("form.messages.verificationSuccess"),
      }
    }
    if (verificationStatus === "expired") {
      return {
        isError: true,
        message: translate("form.messages.verificationExpired"),
      }
    }
    if (verificationStatus === "invalid") {
      return {
        isError: true,
        message: translate("form.messages.verificationInvalid"),
      }
    }
    return null
  }, [translate, verificationStatus])

  function translateError(
    field: FieldPath<SignUpFormInput>,
  ): string | null {
    const error = errors[field]?.message
    if (!error) return null
    const key = VALIDATION_MESSAGE_MAP[error]
    if (key) return translate(`form.validation.${key}`)
    // Password weak fallback for password-specific messages
    if (field === "password") {
      return translate("form.validation.passwordWeak")
    }
    if (field === "passwordConfirmation") {
      if (!watch("passwordConfirmation")) {
        return translate("form.validation.passwordConfirmationRequired")
      }
      return translate("form.validation.passwordsMismatch")
    }
    return error
  }

  async function onSubmit(values: SignUpFormInput) {
    setStatus(null)

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
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          password: values.password,
          acceptTerms: values.acceptTerms,
          redirectTo: callbackUrl.toString(),
          source: isCheckoutEntry ? "checkout" : "sign_up_page",
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        const code =
          typeof payload?.code === "string" ? payload.code : "signup_failed"
        setStatus({
          isError: true,
          message: translate(`form.messages.${getApiErrorMessageKey(code)}`),
        })
        return
      }

      const isAuthenticated = payload.isAuthenticated === true
      const requiresEmailVerification = payload.requiresEmailVerification === true

      if (isAuthenticated && !requiresEmailVerification) {
        setAuthenticatedLayoutState()
        router.replace(nextPath)
        return
      }

      setStatus({
        isError: false,
        message: translate(
          isCheckoutEntry
            ? "form.messages.verificationEmailSentCheckout"
            : "form.messages.verificationEmailSent",
        ),
      })

      setTimeout(() => {
        router.replace("/connexion")
      }, 2000)
    } catch (error) {
      console.error("Erreur inscription utilisateur", { error })
      setStatus({
        isError: true,
        message: translate("form.messages.serverError"),
      })
    }
  }

  const signInPath = safeNextPath
    ? `/connexion?next=${encodeURIComponent(safeNextPath)}`
    : "/connexion"
  const checkoutPath = "/checkout?source=signup"

  const effectiveStatus = status ?? verificationFeedback

  const firstNameMessage = translateError("firstName")
  const lastNameMessage = translateError("lastName")
  const emailMessage = translateError("email")
  const phoneMessage = translateError("phone")
  const passwordMessage = translateError("password")
  const passwordConfirmationMessage = translateError("passwordConfirmation")
  const termsMessage = translateError("acceptTerms")

  const hasErrors = Object.keys(errors).length > 0
  const showGlobalErrorHint = submitCount > 0 && hasErrors && !status

  const hasEmailSentFeedback =
    effectiveStatus?.message ===
      translate("form.messages.verificationEmailSent") ||
    effectiveStatus?.message ===
      translate("form.messages.verificationEmailSentCheckout")
  const hasVerificationSuccessFeedback =
    effectiveStatus?.message === translate("form.messages.verificationSuccess")

  function fieldErrorId(name: string) {
    return `sign-up-${name}-error`
  }

  return (
    <AuthPageSection
      title={translate("title")}
      description={translate("description")}
    >
      <AuthFormCard
        title={translate("form.title")}
        description={translate("form.description")}
        footer={
          <AuthStatusMessage
            message={effectiveStatus?.message ?? null}
            isError={effectiveStatus?.isError ?? false}
          />
        }
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="sign-up-first-name"
                className="text-sm font-medium text-brand-nav"
              >
                {translate("form.fields.firstName.label")}
              </label>
              <InputGroup>
                <InputGroupInput
                  id="sign-up-first-name"
                  type="text"
                  autoComplete="given-name"
                  className="ps-9"
                  placeholder={translate("form.fields.firstName.placeholder")}
                  aria-invalid={Boolean(firstNameMessage)}
                  aria-describedby={
                    firstNameMessage ? fieldErrorId("firstName") : undefined
                  }
                  {...register("firstName")}
                />
                <InputGroupAddon
                  align="inline-start"
                  className="text-slate-500"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
              {firstNameMessage ? (
                <p
                  id={fieldErrorId("firstName")}
                  className="text-xs text-brand-error"
                  role="alert"
                >
                  {firstNameMessage}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="sign-up-last-name"
                className="text-sm font-medium text-brand-nav"
              >
                {translate("form.fields.lastName.label")}
              </label>
              <InputGroup>
                <InputGroupInput
                  id="sign-up-last-name"
                  type="text"
                  autoComplete="family-name"
                  className="ps-9"
                  placeholder={translate("form.fields.lastName.placeholder")}
                  aria-invalid={Boolean(lastNameMessage)}
                  aria-describedby={
                    lastNameMessage ? fieldErrorId("lastName") : undefined
                  }
                  {...register("lastName")}
                />
                <InputGroupAddon
                  align="inline-start"
                  className="text-slate-500"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
              {lastNameMessage ? (
                <p
                  id={fieldErrorId("lastName")}
                  className="text-xs text-brand-error"
                  role="alert"
                >
                  {lastNameMessage}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sign-up-email"
              className="text-sm font-medium text-brand-nav"
            >
              {translate("form.fields.email.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-email"
                type="email"
                autoComplete="email"
                className="ps-9"
                placeholder={translate("form.fields.email.placeholder")}
                aria-invalid={Boolean(emailMessage)}
                aria-describedby={
                  emailMessage ? fieldErrorId("email") : undefined
                }
                {...register("email")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Mail className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            {emailMessage ? (
              <p
                id={fieldErrorId("email")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {emailMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sign-up-phone"
              className="text-sm font-medium text-brand-nav"
            >
              {translate("form.fields.phone.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-phone"
                type="tel"
                autoComplete="tel"
                className="ps-9"
                placeholder={translate("form.fields.phone.placeholder")}
                aria-invalid={Boolean(phoneMessage)}
                aria-describedby={
                  phoneMessage ? fieldErrorId("phone") : undefined
                }
                {...register("phone")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Phone className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            {phoneMessage ? (
              <p
                id={fieldErrorId("phone")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {phoneMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sign-up-password"
              className="text-sm font-medium text-brand-nav"
            >
              {translate("form.fields.password.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                className="ps-9 pe-11"
                placeholder={translate("form.fields.password.placeholder")}
                aria-invalid={Boolean(passwordMessage)}
                aria-describedby={
                  [
                    passwordMessage ? fieldErrorId("password") : null,
                    "sign-up-password-hint",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                {...register("password")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  isPasswordVisible
                    ? translate("form.actions.hidePassword")
                    : translate("form.actions.showPassword")
                }
                onClick={() => setIsPasswordVisible((v) => !v)}
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
                ? translate("form.messages.passwordStrong")
                : translate("form.messages.passwordHint")}
            </p>
            {passwordMessage ? (
              <p
                id={fieldErrorId("password")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sign-up-password-confirmation"
              className="text-sm font-medium text-brand-nav"
            >
              {translate("form.fields.passwordConfirmation.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-password-confirmation"
                type={isPasswordConfirmationVisible ? "text" : "password"}
                autoComplete="new-password"
                className="ps-9 pe-11"
                placeholder={translate(
                  "form.fields.passwordConfirmation.placeholder",
                )}
                aria-invalid={Boolean(passwordConfirmationMessage)}
                aria-describedby={
                  passwordConfirmationMessage
                    ? fieldErrorId("passwordConfirmation")
                    : undefined
                }
                {...register("passwordConfirmation")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
              <button
                type="button"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={
                  isPasswordConfirmationVisible
                    ? translate("form.actions.hidePassword")
                    : translate("form.actions.showPassword")
                }
                onClick={() => setIsPasswordConfirmationVisible((v) => !v)}
              >
                {isPasswordConfirmationVisible ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </InputGroup>
            {passwordConfirmationMessage ? (
              <p
                id={fieldErrorId("passwordConfirmation")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordConfirmationMessage}
              </p>
            ) : null}
          </div>

          <label
            htmlFor="accept-terms"
            className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 p-3 text-sm text-slate-700"
          >
            <input
              id="accept-terms"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border text-brand-cta"
              aria-invalid={Boolean(termsMessage)}
              aria-describedby={
                termsMessage ? fieldErrorId("acceptTerms") : undefined
              }
              {...register("acceptTerms")}
            />
            <span>{translate("form.fields.acceptTerms")}</span>
          </label>
          {termsMessage ? (
            <p
              id={fieldErrorId("acceptTerms")}
              className="text-xs text-brand-error"
              role="alert"
            >
              {termsMessage}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {translate("form.actions.submitting")}
              </>
            ) : (
              translate("form.actions.submit")
            )}
          </Button>

          <p className="text-center text-sm text-slate-600">
            {translate("form.actions.hasAccount")}{" "}
            <Link
              href={signInPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translate("form.actions.goToSignIn")}
            </Link>
          </p>

          {isCheckoutEntry ? (
            <p className="text-center text-sm text-slate-600">
              <Link
                href={checkoutPath}
                className="font-medium text-brand-cta hover:underline"
              >
                {translate("form.actions.goToCheckout")}
              </Link>
            </p>
          ) : null}

          {showGlobalErrorHint ? (
            <p className="text-xs text-brand-error">
              {translate("form.messages.errorHint")}
            </p>
          ) : null}

          {hasEmailSentFeedback || hasVerificationSuccessFeedback ? (
            <p className="text-xs text-slate-600" aria-live="polite">
              {translate("form.messages.nextStepHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
