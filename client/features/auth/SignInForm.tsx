"use client"

import { Lock, Mail } from "lucide-react"
import { type FormEvent, useState } from "react"
import { useTranslations } from "next-intl"
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SignInValidationMessages = {
  emailRequired: string
  emailInvalid: string
  passwordRequired: string
}

function getSignInFormErrorMessage(
  userEmail: string,
  userPassword: string,
  validationMessages: SignInValidationMessages,
): string | null {
  if (!userEmail.trim()) {
    return validationMessages.emailRequired
  }

  if (!EMAIL_PATTERN.test(userEmail.trim())) {
    return validationMessages.emailInvalid
  }

  if (!userPassword.trim()) {
    return validationMessages.passwordRequired
  }

  return null
}

export function SignInForm() {
  const translateSignIn = useTranslations("Pages.signIn")
  const [emailValue, setEmailValue] = useState("")
  const [passwordValue, setPasswordValue] = useState("")
  const [isRememberSessionEnabled, setIsRememberSessionEnabled] =
    useState(false)
  const [isSignInErrorVisible, setIsSignInErrorVisible] = useState(false)
  const [isSignInSuccessful, setIsSignInSuccessful] = useState(false)
  const [signInStatusMessage, setSignInStatusMessage] = useState<string | null>(
    null,
  )

  const validationMessages: SignInValidationMessages = {
    emailRequired: translateSignIn("form.validation.emailRequired"),
    emailInvalid: translateSignIn("form.validation.emailInvalid"),
    passwordRequired: translateSignIn("form.validation.passwordRequired"),
  }

  const signInErrorMessage = getSignInFormErrorMessage(
    emailValue,
    passwordValue,
    validationMessages,
  )

  const canSubmitSignInForm = !signInErrorMessage

  function handleSignInFormSubmit(formSubmitEvent: FormEvent<HTMLFormElement>) {
    formSubmitEvent.preventDefault()

    if (!canSubmitSignInForm) {
      setIsSignInErrorVisible(true)
      setIsSignInSuccessful(false)
      setSignInStatusMessage(signInErrorMessage)
      return
    }

    setIsSignInErrorVisible(false)
    setIsSignInSuccessful(true)
    setSignInStatusMessage(translateSignIn("form.messages.success"))
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
            message={signInStatusMessage}
            isError={isSignInErrorVisible}
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
                value={emailValue}
                onChange={(changeEvent) => {
                  setEmailValue(changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignIn("form.fields.email.placeholder")}
                aria-invalid={isSignInErrorVisible && !emailValue.trim()}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Mail className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
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
                type="password"
                autoComplete="current-password"
                value={passwordValue}
                onChange={(changeEvent) => {
                  setPasswordValue(changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignIn(
                  "form.fields.password.placeholder",
                )}
                aria-invalid={isSignInErrorVisible && !passwordValue.trim()}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
          </div>

          <label
            htmlFor="remember-session"
            className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 p-3 text-sm text-slate-700"
          >
            <input
              id="remember-session"
              name="remember-session"
              type="checkbox"
              checked={isRememberSessionEnabled}
              onChange={(changeEvent) => {
                setIsRememberSessionEnabled(changeEvent.target.checked)
              }}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand-cta"
            />
            <span>{translateSignIn("form.fields.rememberSession")}</span>
          </label>

          <Button type="submit" className="w-full">
            {translateSignIn("form.actions.submit")}
          </Button>

          <p className="text-center text-sm text-slate-600">
            {translateSignIn("form.actions.noAccount")}{" "}
            <Link
              href="/inscription"
              className="font-medium text-brand-cta hover:underline"
            >
              {translateSignIn("form.actions.goToSignUp")}
            </Link>
          </p>

          {!isSignInSuccessful && isSignInErrorVisible ? (
            <p className="text-xs text-brand-error">
              {translateSignIn("form.messages.errorHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
