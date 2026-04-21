"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import type { CheckoutFlow } from "./useCheckoutFlow"

type CheckoutAuthStepProps = {
  flow: CheckoutFlow
}

const AUTH_ERROR_KEYS = new Set([
  "guestEmailInvalid",
  "signInEmailInvalid",
  "passwordRequired",
  "authConfigUnavailableSignIn",
  "sessionUnavailableAfterSignIn",
  "signInFailed",
  "fullNameRequired",
  "signUpEmailInvalid",
  "passwordTooShort",
  "passwordMismatch",
  "authConfigUnavailableSignUp",
  "signUpFailed",
])

export function CheckoutAuthStep({ flow }: CheckoutAuthStepProps) {
  const t = useTranslations("CheckoutPage")

  const authErrorMessage = flow.authErrorKey
    ? AUTH_ERROR_KEYS.has(flow.authErrorKey)
      ? t(`auth.errors.${flow.authErrorKey}`)
      : flow.authErrorKey
    : null

  const authSuccessMessage = flow.authSuccessKey
    ? t(`auth.success.${flow.authSuccessKey}`)
    : null

  return (
    <section className="space-y-4" aria-label={t("auth.ariaLabel")}>
      {flow.authUser ? (
        <div className="rounded-lg border border-brand-success/40 bg-brand-success/10 p-3 text-sm text-brand-nav">
          <p className="font-semibold">{t("auth.connected.title")}</p>
          <p>
            {t("auth.connected.description", {
              email: flow.authUser.email,
            })}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["guest", "signIn", "signUp"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={flow.authMode === mode ? "default" : "outline"}
                className={cn(
                  flow.authMode === mode &&
                    "bg-brand-cta text-white hover:bg-brand-cta/90",
                )}
                onClick={() => {
                  flow.setAuthMode(mode)
                  flow.resetAuthMessages()
                }}
              >
                {t(`auth.modes.${mode}`)}
              </Button>
            ))}
          </div>

          {flow.authMode === "guest" ? (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <p className="text-sm text-slate-700">
                {t("auth.guest.description")}
              </p>
              <div className="space-y-1">
                <label
                  htmlFor="checkout-guest-email"
                  className="text-sm font-medium text-brand-nav"
                >
                  {t("auth.guest.emailLabel")}
                </label>
                <input
                  id="checkout-guest-email"
                  type="email"
                  autoComplete="email"
                  value={flow.guestEmail}
                  onChange={(event) => flow.setGuestEmail(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                />
              </div>
              <Button
                type="button"
                className="bg-brand-cta text-white hover:bg-brand-cta/90"
                onClick={flow.handleContinueAsGuest}
              >
                {t("auth.guest.continue")}
              </Button>
            </div>
          ) : null}

          {flow.authMode === "signIn" ? (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <div className="space-y-1">
                <label
                  htmlFor="checkout-signin-email"
                  className="text-sm font-medium text-brand-nav"
                >
                  {t("auth.signIn.emailLabel")}
                </label>
                <input
                  id="checkout-signin-email"
                  type="email"
                  autoComplete="email"
                  value={flow.signInEmail}
                  onChange={(event) => flow.setSignInEmail(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="checkout-signin-password"
                  className="text-sm font-medium text-brand-nav"
                >
                  {t("auth.signIn.passwordLabel")}
                </label>
                <input
                  id="checkout-signin-password"
                  type="password"
                  autoComplete="current-password"
                  value={flow.signInPassword}
                  onChange={(event) =>
                    flow.setSignInPassword(event.target.value)
                  }
                  className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                />
              </div>
              <p className="text-sm text-slate-600">
                <Link
                  href="/mot-de-passe-oublie?source=checkout&next=/checkout"
                  className="font-medium text-brand-cta hover:underline"
                >
                  {t("auth.signIn.forgotPassword")}
                </Link>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-brand-cta text-white hover:bg-brand-cta/90"
                  onClick={() => void flow.handleSignInAndContinue()}
                  disabled={flow.isAuthSubmitting}
                >
                  {flow.isAuthSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("auth.signIn.submitting")}
                    </>
                  ) : (
                    t("auth.signIn.continue")
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/connexion?source=checkout&next=/checkout">
                    {t("auth.signIn.openPage")}
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          {flow.authMode === "signUp" ? (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <div className="space-y-1">
                <label
                  htmlFor="checkout-signup-name"
                  className="text-sm font-medium text-brand-nav"
                >
                  {t("auth.signUp.fullNameLabel")}
                </label>
                <input
                  id="checkout-signup-name"
                  type="text"
                  autoComplete="name"
                  value={flow.signUpFullName}
                  onChange={(event) =>
                    flow.setSignUpFullName(event.target.value)
                  }
                  className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="checkout-signup-email"
                  className="text-sm font-medium text-brand-nav"
                >
                  {t("auth.signUp.emailLabel")}
                </label>
                <input
                  id="checkout-signup-email"
                  type="email"
                  autoComplete="email"
                  value={flow.signUpEmail}
                  onChange={(event) => flow.setSignUpEmail(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="checkout-signup-password"
                    className="text-sm font-medium text-brand-nav"
                  >
                    {t("auth.signUp.passwordLabel")}
                  </label>
                  <input
                    id="checkout-signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={flow.signUpPassword}
                    onChange={(event) =>
                      flow.setSignUpPassword(event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="checkout-signup-password-confirm"
                    className="text-sm font-medium text-brand-nav"
                  >
                    {t("auth.signUp.passwordConfirmLabel")}
                  </label>
                  <input
                    id="checkout-signup-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={flow.signUpPasswordConfirm}
                    onChange={(event) =>
                      flow.setSignUpPasswordConfirm(event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-brand-cta text-white hover:bg-brand-cta/90"
                  onClick={() => void flow.handleSignUpAndContinue()}
                  disabled={flow.isAuthSubmitting}
                >
                  {flow.isAuthSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("auth.signUp.submitting")}
                    </>
                  ) : (
                    t("auth.signUp.continue")
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/inscription?source=checkout&next=/checkout">
                    {t("auth.signUp.openPage")}
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {authErrorMessage ? (
        <p className="text-sm text-brand-error" role="alert">
          {authErrorMessage}
        </p>
      ) : null}

      {authSuccessMessage ? (
        <p
          className="text-sm text-brand-success"
          role="status"
          aria-live="polite"
        >
          {authSuccessMessage}
        </p>
      ) : null}

      {flow.authUser ? (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            className="bg-brand-cta text-white hover:bg-brand-cta/90"
            onClick={() => flow.goToStep(2)}
          >
            {t("auth.connected.continueToAddress")}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
