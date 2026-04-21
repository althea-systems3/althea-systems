"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import { Link, useRouter } from "@/i18n/navigation"
import { secureFetch } from "@/lib/http/secureFetch"
import {
  adminTwoFactorSchema,
  type AdminTwoFactorInput,
} from "@/lib/validation/authSchemas"

import {
  AuthFormCard,
  AuthPageSection,
  AuthStatusMessage,
} from "./authFormShared"

type TwoFactorStatus = {
  message: string
  isError: boolean
}

const RESEND_COOLDOWN_SECONDS = 30

function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) return null
  const normalized = nextPath.trim()
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null
  return normalized
}

const CHALLENGE_ERROR_KEYS: Record<string, string> = {
  session_expired: "sessionExpired",
  challenge_unavailable: "challengeUnavailable",
  admin_required: "adminRequired",
}

const VERIFY_ERROR_KEYS: Record<string, string> = {
  invalid_code: "invalidCode",
  challenge_expired: "challengeExpired",
  challenge_missing: "challengeExpired",
  too_many_attempts: "tooManyAttempts",
  session_expired: "sessionExpired",
  admin_required: "adminRequired",
}

function mapChallengeErrorCode(code: string): string {
  return CHALLENGE_ERROR_KEYS[code] ?? "challengeUnavailable"
}

function mapVerifyErrorCode(code: string): string {
  return VERIFY_ERROR_KEYS[code] ?? "verifyFailed"
}

export function AdminTwoFactorForm() {
  const translateForm = useTranslations("Pages.adminTwoFactor")
  const router = useRouter()
  const searchParams = useSearchParams()

  const safeNextPath = getSafeNextPath(searchParams.get("next"))
  const nextPath = safeNextPath ?? "/admin"

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<AdminTwoFactorInput>({
    resolver: zodResolver(adminTwoFactorSchema),
    defaultValues: { code: "" },
    mode: "onSubmit",
  })

  const [isSendingCode, setIsSendingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timerId = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [resendCooldown])

  const requestChallenge = useCallback(
    async (showSuccessMessage: boolean) => {
      setIsSendingCode(true)

      try {
        const response = await secureFetch("/api/auth/admin-2fa/challenge", {
          method: "POST",
          body: JSON.stringify({}),
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          const code =
            typeof payload?.code === "string"
              ? payload.code
              : "challenge_unavailable"

          if (code === "session_expired") {
            router.replace(
              `/connexion?reason=session_expired&next=${encodeURIComponent(nextPath)}`,
            )
            return
          }

          setStatus({
            isError: true,
            message: translateForm(
              `messages.${mapChallengeErrorCode(code)}`,
            ),
          })
          return
        }

        setResendCooldown(RESEND_COOLDOWN_SECONDS)

        if (showSuccessMessage) {
          setStatus({
            isError: false,
            message: translateForm("messages.codeSent"),
          })
        }
      } catch (error) {
        console.error("Erreur challenge 2FA admin", { error })
        setStatus({
          isError: true,
          message: translateForm("messages.serverError"),
        })
      } finally {
        setIsSendingCode(false)
      }
    },
    [nextPath, router, translateForm],
  )

  useEffect(() => {
    void requestChallenge(false)
  }, [requestChallenge])

  async function onSubmit(values: AdminTwoFactorInput) {
    setStatus(null)

    try {
      const response = await secureFetch("/api/auth/admin-2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code: values.code }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const code =
          typeof payload?.code === "string" ? payload.code : "verify_failed"

        if (code === "session_expired") {
          router.replace(
            `/connexion?reason=session_expired&next=${encodeURIComponent(nextPath)}`,
          )
          return
        }

        setStatus({
          isError: true,
          message: translateForm(`messages.${mapVerifyErrorCode(code)}`),
        })
        return
      }

      setStatus({
        isError: false,
        message: translateForm("messages.verifiedRedirecting"),
      })

      router.replace(nextPath)
    } catch (error) {
      console.error("Erreur vérification 2FA admin", { error })
      setStatus({
        isError: true,
        message: translateForm("messages.serverError"),
      })
    }
  }

  const submitLabel = isSubmitting
    ? translateForm("actions.verifying")
    : translateForm("actions.verify")

  const resendLabel = useMemo(() => {
    if (resendCooldown <= 0) {
      return translateForm("actions.resendCode")
    }
    return translateForm("actions.resendIn", {
      seconds: String(resendCooldown),
    })
  }, [resendCooldown, translateForm])

  return (
    <AuthPageSection
      title={translateForm("title")}
      description={translateForm("description")}
    >
      <AuthFormCard
        title={translateForm("form.title")}
        description={translateForm("form.description")}
        footer={
          <AuthStatusMessage
            message={status?.message ?? null}
            isError={status?.isError ?? false}
          />
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="space-y-1.5" htmlFor="admin-2fa-code">
            <span className="text-sm font-medium text-brand-nav">
              {translateForm("fields.code.label")}
            </span>
            <InputGroup>
              <InputGroupInput
                id="admin-2fa-code"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder={translateForm("fields.code.placeholder")}
                className="tracking-[0.35em]"
                aria-label={translateForm("fields.code.label")}
                {...register("code")}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replaceAll(/\D/g, "")
                  setValue("code", digitsOnly.slice(0, 6), {
                    shouldValidate: false,
                  })
                }}
              />
            </InputGroup>
          </label>

          <div className="rounded-md border border-border/70 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="flex items-center gap-2">
              <ShieldCheck
                className="size-4 text-brand-nav"
                aria-hidden="true"
              />
              {translateForm("hints.expiry")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {submitLabel}
                </>
              ) : (
                submitLabel
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void requestChallenge(true)
              }}
              disabled={isSendingCode || isSubmitting || resendCooldown > 0}
            >
              {isSendingCode ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {translateForm("actions.sending")}
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" aria-hidden="true" />
                  {resendLabel}
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-slate-600">
            <Link
              href="/connexion"
              className="font-medium text-brand-cta hover:underline"
            >
              {translateForm("actions.backToSignIn")}
            </Link>
          </p>
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
