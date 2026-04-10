"use client"

import { Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { useSearchParams } from "next/navigation"
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import { Link, useRouter } from "@/i18n/navigation"
import { secureFetch } from "@/lib/http/secureFetch"
import { useTranslations } from "next-intl"
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
  if (!nextPath) {
    return null
  }

  const normalizedPath = nextPath.trim()

  if (!normalizedPath.startsWith("/") || normalizedPath.startsWith("//")) {
    return null
  }

  return normalizedPath
}

function mapChallengeErrorCode(code: string): string {
  if (code === "session_expired") {
    return "sessionExpired"
  }

  if (code === "challenge_unavailable") {
    return "challengeUnavailable"
  }

  if (code === "admin_required") {
    return "adminRequired"
  }

  return "challengeUnavailable"
}

function mapVerifyErrorCode(code: string): string {
  if (code === "invalid_code") {
    return "invalidCode"
  }

  if (code === "challenge_expired" || code === "challenge_missing") {
    return "challengeExpired"
  }

  if (code === "too_many_attempts") {
    return "tooManyAttempts"
  }

  if (code === "session_expired") {
    return "sessionExpired"
  }

  if (code === "admin_required") {
    return "adminRequired"
  }

  return "verifyFailed"
}

function isSixDigits(value: string): boolean {
  return /^\d{6}$/.test(value)
}

export function AdminTwoFactorForm() {
  const translateForm = useTranslations("Pages.adminTwoFactor")
  const router = useRouter()
  const searchParams = useSearchParams()

  const safeNextPath = getSafeNextPath(searchParams.get("next"))
  const nextPath = safeNextPath ?? "/admin"

  const [verificationCode, setVerificationCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }

    const timerId = window.setTimeout(() => {
      setResendCooldown((currentValue) => Math.max(currentValue - 1, 0))
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
          const responseCode =
            typeof payload?.code === "string"
              ? payload.code
              : "challenge_unavailable"

          if (responseCode === "session_expired") {
            router.replace(
              `/connexion?reason=session_expired&next=${encodeURIComponent(nextPath)}`,
            )
            return
          }

          setStatus({
            isError: true,
            message: translateForm(
              `messages.${mapChallengeErrorCode(responseCode)}`,
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

  async function handleSubmit(formSubmitEvent: FormEvent<HTMLFormElement>) {
    formSubmitEvent.preventDefault()

    if (!isSixDigits(verificationCode)) {
      setStatus({
        isError: true,
        message: translateForm("messages.invalidCodeFormat"),
      })
      return
    }

    setIsSubmitting(true)
    setStatus(null)

    try {
      const response = await secureFetch("/api/auth/admin-2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code: verificationCode }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const responseCode =
          typeof payload?.code === "string" ? payload.code : "verify_failed"

        if (responseCode === "session_expired") {
          router.replace(
            `/connexion?reason=session_expired&next=${encodeURIComponent(nextPath)}`,
          )
          return
        }

        setStatus({
          isError: true,
          message: translateForm(
            `messages.${mapVerifyErrorCode(responseCode)}`,
          ),
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
    } finally {
      setIsSubmitting(false)
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
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="space-y-1.5" htmlFor="admin-2fa-code">
            <span className="text-sm font-medium text-brand-nav">
              {translateForm("fields.code.label")}
            </span>
            <InputGroup>
              <InputGroupInput
                id="admin-2fa-code"
                name="admin-2fa-code"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replaceAll(/\D/g, "")
                  setVerificationCode(digitsOnly.slice(0, 6))
                }}
                placeholder={translateForm("fields.code.placeholder")}
                className="tracking-[0.35em]"
                aria-label={translateForm("fields.code.label")}
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
