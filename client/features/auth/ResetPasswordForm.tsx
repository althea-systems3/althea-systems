"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, Lock } from "lucide-react"
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
import { Link, useRouter } from "@/i18n/navigation"
import { secureFetch } from "@/lib/http/secureFetch"
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validation/authSchemas"

import {
  AuthFormCard,
  AuthPageSection,
  AuthStatusMessage,
} from "./authFormShared"
import { isStrongPassword } from "./signUpValidation"

type ResetPasswordStatus = {
  message: string
  isError: boolean
}

function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) return null
  const normalized = nextPath.trim()
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null
  return normalized
}

function appendQueryParam(path: string, key: string, value: string): string {
  const [pathname, queryString = ""] = path.split("?")
  const params = new URLSearchParams(queryString)
  params.set(key, value)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

function buildPathWithContext(
  basePath: string,
  nextPath: string | null,
): string {
  return nextPath ? appendQueryParam(basePath, "next", nextPath) : basePath
}

const API_ERROR_KEYS: Record<string, string> = {
  session_expired: "sessionExpired",
  password_too_weak: "passwordTooWeak",
  server_error: "serverError",
}

function getApiErrorMessageKey(errorCode: string): string {
  return API_ERROR_KEYS[errorCode] ?? "resetFailed"
}

export function ResetPasswordForm() {
  const translate = useTranslations("Pages.resetPassword")
  const router = useRouter()
  const searchParams = useSearchParams()

  const recoveryStatus = searchParams.get("recovery")
  const safeNextPath = getSafeNextPath(searchParams.get("next"))

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", passwordConfirmation: "" },
    mode: "onTouched",
  })

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
  const [status, setStatus] = useState<ResetPasswordStatus | null>(null)

  const passwordValue = watch("password")
  const hasStrongPassword = isStrongPassword(passwordValue ?? "")

  const queryFeedback = useMemo<ResetPasswordStatus | null>(() => {
    if (recoveryStatus === "expired") {
      return {
        isError: true,
        message: translate("form.messages.tokenExpired"),
      }
    }
    if (recoveryStatus === "invalid") {
      return {
        isError: true,
        message: translate("form.messages.tokenInvalid"),
      }
    }
    return null
  }, [recoveryStatus, translate])

  function passwordErrorToMessage(error: string | undefined): string | null {
    if (!error) return null
    if (error === "Mot de passe requis.") {
      return translate("form.validation.passwordRequired")
    }
    return translate("form.validation.passwordWeak")
  }

  function confirmationErrorToMessage(
    error: string | undefined,
    confirmationValue: string,
  ): string | null {
    if (!error) return null
    if (!confirmationValue) {
      return translate("form.validation.passwordConfirmationRequired")
    }
    return translate("form.validation.passwordsMismatch")
  }

  const passwordMessage = passwordErrorToMessage(errors.password?.message)
  const confirmationMessage = confirmationErrorToMessage(
    errors.passwordConfirmation?.message,
    watch("passwordConfirmation") ?? "",
  )

  async function onSubmit(values: ResetPasswordInput) {
    setStatus(null)

    if (recoveryStatus === "invalid" || recoveryStatus === "expired") {
      setStatus({
        isError: true,
        message: translate("form.messages.requestNewLink"),
      })
      return
    }

    try {
      const response = await secureFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          password: values.password,
          passwordConfirmation: values.passwordConfirmation,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        const code =
          typeof payload?.code === "string" ? payload.code : "reset_failed"
        setStatus({
          isError: true,
          message: translate(
            `form.messages.${getApiErrorMessageKey(code)}`,
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
      setStatus({
        isError: true,
        message: translate("form.messages.serverError"),
      })
    }
  }

  const forgotPasswordPath = buildPathWithContext(
    "/mot-de-passe-oublie",
    safeNextPath,
  )
  const signInPath = buildPathWithContext("/connexion", safeNextPath)
  const effectiveStatus = status ?? queryFeedback

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
          <div className="space-y-1.5">
            <label
              htmlFor="reset-password"
              className="text-sm font-medium text-brand-nav"
            >
              {translate("form.fields.password.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="reset-password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="new-password"
                className="ps-9 pe-11"
                placeholder={translate("form.fields.password.placeholder")}
                aria-invalid={Boolean(passwordMessage)}
                aria-describedby={
                  [
                    passwordMessage ? "reset-password-error" : null,
                    "reset-password-hint",
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
            <p id="reset-password-hint" className="text-xs text-slate-600">
              {hasStrongPassword
                ? translate("form.messages.passwordStrong")
                : translate("form.messages.passwordHint")}
            </p>
            {passwordMessage ? (
              <p
                id="reset-password-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {passwordMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reset-password-confirmation"
              className="text-sm font-medium text-brand-nav"
            >
              {translate("form.fields.passwordConfirmation.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="reset-password-confirmation"
                type={isPasswordConfirmationVisible ? "text" : "password"}
                autoComplete="new-password"
                className="ps-9 pe-11"
                placeholder={translate(
                  "form.fields.passwordConfirmation.placeholder",
                )}
                aria-invalid={Boolean(confirmationMessage)}
                aria-describedby={
                  confirmationMessage
                    ? "reset-password-confirmation-error"
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
                onClick={() =>
                  setIsPasswordConfirmationVisible((v) => !v)
                }
              >
                {isPasswordConfirmationVisible ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </InputGroup>
            {confirmationMessage ? (
              <p
                id="reset-password-confirmation-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {confirmationMessage}
              </p>
            ) : null}
          </div>

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
            <Link
              href={forgotPasswordPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translate("form.actions.requestNewLink")}
            </Link>
          </p>

          <p className="text-center text-sm text-slate-600">
            <Link
              href={signInPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translate("form.actions.goToSignIn")}
            </Link>
          </p>

          {effectiveStatus?.isError ? (
            <p className="text-xs text-brand-error" role="alert">
              {translate("form.messages.errorHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
