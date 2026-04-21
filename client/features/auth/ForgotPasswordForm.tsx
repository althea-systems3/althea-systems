"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Mail } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Link } from "@/i18n/navigation"
import { secureFetch } from "@/lib/http/secureFetch"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validation/authSchemas"

import {
  AuthFormCard,
  AuthPageSection,
  AuthStatusMessage,
} from "./authFormShared"

type ForgotPasswordStatus = {
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
  rate_limited: "rateLimited",
  server_error: "serverError",
}

function getApiErrorMessageKey(errorCode: string): string {
  return API_ERROR_KEYS[errorCode] ?? "requestFailed"
}

export function ForgotPasswordForm() {
  const translate = useTranslations("Pages.forgotPassword")
  const locale = useLocale()
  const searchParams = useSearchParams()

  const source = searchParams.get("source")
  const safeNextPath = getSafeNextPath(searchParams.get("next"))
  const isCheckoutEntry =
    source === "checkout" ||
    safeNextPath === "/checkout" ||
    Boolean(safeNextPath?.startsWith("/checkout?"))
  const sourceContext = isCheckoutEntry ? "checkout" : null
  const nextPath =
    safeNextPath ?? (isCheckoutEntry ? "/checkout" : "/mon-compte")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  })

  const [status, setStatus] = useState<ForgotPasswordStatus | null>(null)

  const emailError = errors.email?.message
  const emailMessage = emailError
    ? emailError === "Email requis."
      ? translate("form.validation.emailRequired")
      : translate("form.validation.emailInvalid")
    : null

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

  async function onSubmit(values: ForgotPasswordInput) {
    setStatus(null)

    try {
      const callbackUrl = new URL("/auth/reset", window.location.origin)
      callbackUrl.searchParams.set("locale", locale)
      callbackUrl.searchParams.set("next", nextPath)
      if (sourceContext) callbackUrl.searchParams.set("source", sourceContext)

      const response = await secureFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          redirectTo: callbackUrl.toString(),
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        const code =
          typeof payload?.code === "string" ? payload.code : "request_failed"
        setStatus({
          isError: true,
          message: translate(
            `form.messages.${getApiErrorMessageKey(code)}`,
          ),
        })
        return
      }

      setStatus({
        isError: false,
        message: translate("form.messages.emailSentNeutral"),
      })
    } catch (error) {
      console.error("Erreur demande reset password", { error })
      setStatus({
        isError: true,
        message: translate("form.messages.serverError"),
      })
    }
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
            message={status?.message ?? null}
            isError={status?.isError ?? false}
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
              htmlFor="forgot-password-email"
              className="text-sm font-medium text-brand-nav"
            >
              {translate("form.fields.email.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="forgot-password-email"
                type="email"
                autoComplete="email"
                className="ps-9"
                placeholder={translate("form.fields.email.placeholder")}
                aria-invalid={Boolean(emailMessage)}
                aria-describedby={
                  emailMessage ? "forgot-password-email-error" : undefined
                }
                {...register("email")}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Mail className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            {emailMessage ? (
              <p
                id="forgot-password-email-error"
                className="text-xs text-brand-error"
                role="alert"
              >
                {emailMessage}
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
            {translate("form.actions.hasAccount")}{" "}
            <Link
              href={signInPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translate("form.actions.goToSignIn")}
            </Link>
          </p>

          <p className="text-center text-sm text-slate-600">
            {translate("form.actions.noAccount")}{" "}
            <Link
              href={signUpPath}
              className="font-medium text-brand-cta hover:underline"
            >
              {translate("form.actions.goToSignUp")}
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

          {status && !status.isError ? (
            <p className="text-xs text-slate-600" aria-live="polite">
              {translate("form.messages.nextStepHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
