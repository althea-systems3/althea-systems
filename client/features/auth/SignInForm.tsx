"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslations } from "next-intl"
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
  signInSchema,
  type SignInInput,
} from "@/lib/validation/authSchemas"

import {
  AuthFormCard,
  AuthPageSection,
  AuthStatusMessage,
} from "./authFormShared"

type SignInStatus = {
  message: string
  isError: boolean
}

function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) return null
  const normalized = nextPath.trim()
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null
  return normalized
}

function buildPathWithContext(
  basePath: string,
  nextPath: string | null,
  source: string | null,
): string {
  const params = new URLSearchParams()
  if (nextPath) params.set("next", nextPath)
  if (source) params.set("source", source)
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

const API_ERROR_KEYS: Record<string, string> = {
  invalid_credentials: "invalidCredentials",
  account_not_found: "accountNotFound",
  incorrect_password: "incorrectPassword",
  email_not_verified: "accountNotVerified",
  session_expired: "sessionExpired",
  server_error: "serverError",
  challenge_unavailable: "adminTwoFactorUnavailable",
}

function getApiErrorMessageKey(errorCode: string): string {
  return API_ERROR_KEYS[errorCode] ?? "signInFailed"
}

function setAuthenticatedLayoutState(): void {
  if (typeof window === "undefined") return
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
  const nextPath = safeNextPath ?? (isCheckoutEntry ? "/checkout" : "/mon-compte")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberSession: false },
    mode: "onTouched",
  })

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [signInStatus, setSignInStatus] = useState<SignInStatus | null>(null)

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

  async function onSubmit(values: SignInInput) {
    clearErrors("root")
    setSignInStatus(null)

    try {
      const response = await secureFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(values),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        const code =
          typeof payload?.code === "string" ? payload.code : "signin_failed"
        setSignInStatus({
          isError: true,
          message: translateSignIn(
            `form.messages.${getApiErrorMessageKey(code)}`,
          ),
        })
        return
      }

      if (payload.requiresAdminTwoFactor === true) {
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
  const submitLabel = isSubmitting
    ? translateSignIn("form.actions.submitting")
    : translateSignIn("form.actions.submit")

  function fieldErrorId(name: string) {
    return `sign-in-${name}-error`
  }

  const emailError = errors.email?.message
  const passwordError = errors.password?.message

  // Override des messages Zod par les traductions
  const emailMessage = emailError
    ? emailError === "Email requis."
      ? translateSignIn("form.validation.emailRequired")
      : translateSignIn("form.validation.emailInvalid")
    : null
  const passwordMessage = passwordError
    ? translateSignIn("form.validation.passwordRequired")
    : null

  const hasErrors = Boolean(emailMessage || passwordMessage)

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
          onSubmit={handleSubmit(onSubmit)}
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
                type="email"
                autoComplete="email"
                className="ps-9"
                placeholder={translateSignIn("form.fields.email.placeholder")}
                aria-invalid={Boolean(emailMessage)}
                aria-describedby={emailMessage ? fieldErrorId("email") : undefined}
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
              htmlFor="sign-in-password"
              className="text-sm font-medium text-brand-nav"
            >
              {translateSignIn("form.fields.password.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-in-password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                className="ps-9 pe-11"
                placeholder={translateSignIn(
                  "form.fields.password.placeholder",
                )}
                aria-invalid={Boolean(passwordMessage)}
                aria-describedby={
                  passwordMessage ? fieldErrorId("password") : undefined
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
                    ? translateSignIn("form.actions.hidePassword")
                    : translateSignIn("form.actions.showPassword")
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
            {passwordMessage ? (
              <p
                id={fieldErrorId("password")}
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordMessage}
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
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border text-brand-cta"
              {...register("rememberSession")}
            />
            <span>{translateSignIn("form.fields.rememberSession")}</span>
          </label>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
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

          {hasErrors && !signInStatus ? (
            <p className="text-xs text-brand-error">
              {translateSignIn("form.messages.errorHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
