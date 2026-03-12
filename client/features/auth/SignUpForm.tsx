"use client"

import { Lock, Mail, UserRound } from "lucide-react"
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
const PASSWORD_MIN_LENGTH = 8

type SignUpValidationMessages = {
  fullNameRequired: string
  emailRequired: string
  emailInvalid: string
  passwordRequired: string
  passwordMinLength: string
  passwordConfirmationRequired: string
  passwordsMismatch: string
  termsRequired: string
}

type SignUpFormValues = {
  fullName: string
  email: string
  password: string
  passwordConfirmation: string
  hasAcceptedTerms: boolean
}

function getSignUpFormErrorMessage(
  signUpFormValues: SignUpFormValues,
  validationMessages: SignUpValidationMessages,
): string | null {
  if (!signUpFormValues.fullName.trim()) {
    return validationMessages.fullNameRequired
  }

  if (!signUpFormValues.email.trim()) {
    return validationMessages.emailRequired
  }

  if (!EMAIL_PATTERN.test(signUpFormValues.email.trim())) {
    return validationMessages.emailInvalid
  }

  if (!signUpFormValues.password) {
    return validationMessages.passwordRequired
  }

  if (signUpFormValues.password.length < PASSWORD_MIN_LENGTH) {
    return validationMessages.passwordMinLength
  }

  if (!signUpFormValues.passwordConfirmation) {
    return validationMessages.passwordConfirmationRequired
  }

  if (signUpFormValues.password !== signUpFormValues.passwordConfirmation) {
    return validationMessages.passwordsMismatch
  }

  if (!signUpFormValues.hasAcceptedTerms) {
    return validationMessages.termsRequired
  }

  return null
}

function getHasStrongPassword(passwordValue: string): boolean {
  const hasLowercaseCharacter = /[a-z]/.test(passwordValue)
  const hasUppercaseCharacter = /[A-Z]/.test(passwordValue)
  const hasNumericCharacter = /\d/.test(passwordValue)

  return (
    passwordValue.length >= PASSWORD_MIN_LENGTH &&
    hasLowercaseCharacter &&
    hasUppercaseCharacter &&
    hasNumericCharacter
  )
}

export function SignUpForm() {
  const translateSignUp = useTranslations("Pages.signUp")
  const [fullNameValue, setFullNameValue] = useState("")
  const [emailValue, setEmailValue] = useState("")
  const [passwordValue, setPasswordValue] = useState("")
  const [passwordConfirmationValue, setPasswordConfirmationValue] = useState("")
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const [isSignUpErrorVisible, setIsSignUpErrorVisible] = useState(false)
  const [isSignUpSuccessful, setIsSignUpSuccessful] = useState(false)
  const [signUpStatusMessage, setSignUpStatusMessage] = useState<string | null>(
    null,
  )

  const validationMessages: SignUpValidationMessages = {
    fullNameRequired: translateSignUp("form.validation.fullNameRequired"),
    emailRequired: translateSignUp("form.validation.emailRequired"),
    emailInvalid: translateSignUp("form.validation.emailInvalid"),
    passwordRequired: translateSignUp("form.validation.passwordRequired"),
    passwordMinLength: translateSignUp("form.validation.passwordMinLength"),
    passwordConfirmationRequired: translateSignUp(
      "form.validation.passwordConfirmationRequired",
    ),
    passwordsMismatch: translateSignUp("form.validation.passwordsMismatch"),
    termsRequired: translateSignUp("form.validation.termsRequired"),
  }

  const signUpErrorMessage = getSignUpFormErrorMessage(
    {
      fullName: fullNameValue,
      email: emailValue,
      password: passwordValue,
      passwordConfirmation: passwordConfirmationValue,
      hasAcceptedTerms,
    },
    validationMessages,
  )

  const canSubmitSignUpForm = !signUpErrorMessage
  const hasStrongPassword = getHasStrongPassword(passwordValue)

  function handleSignUpFormSubmit(formSubmitEvent: FormEvent<HTMLFormElement>) {
    formSubmitEvent.preventDefault()

    if (!canSubmitSignUpForm) {
      setIsSignUpErrorVisible(true)
      setIsSignUpSuccessful(false)
      setSignUpStatusMessage(signUpErrorMessage)
      return
    }

    setIsSignUpErrorVisible(false)
    setIsSignUpSuccessful(true)
    setSignUpStatusMessage(translateSignUp("form.messages.success"))
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
            message={signUpStatusMessage}
            isError={isSignUpErrorVisible}
          />
        }
      >
        <form
          className="space-y-4"
          onSubmit={handleSignUpFormSubmit}
          noValidate
        >
          <div className="space-y-1.5">
            <label
              htmlFor="sign-up-full-name"
              className="text-sm font-medium text-brand-nav"
            >
              {translateSignUp("form.fields.fullName.label")}
            </label>
            <InputGroup>
              <InputGroupInput
                id="sign-up-full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullNameValue}
                onChange={(changeEvent) => {
                  setFullNameValue(changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignUp(
                  "form.fields.fullName.placeholder",
                )}
                aria-invalid={isSignUpErrorVisible && !fullNameValue.trim()}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <UserRound className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
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
                value={emailValue}
                onChange={(changeEvent) => {
                  setEmailValue(changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignUp("form.fields.email.placeholder")}
                aria-invalid={isSignUpErrorVisible && !emailValue.trim()}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Mail className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
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
                type="password"
                autoComplete="new-password"
                value={passwordValue}
                onChange={(changeEvent) => {
                  setPasswordValue(changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignUp(
                  "form.fields.password.placeholder",
                )}
                aria-invalid={isSignUpErrorVisible && !passwordValue}
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            <p className="text-xs text-slate-600">
              {hasStrongPassword
                ? translateSignUp("form.messages.passwordStrong")
                : translateSignUp("form.messages.passwordHint")}
            </p>
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
                type="password"
                autoComplete="new-password"
                value={passwordConfirmationValue}
                onChange={(changeEvent) => {
                  setPasswordConfirmationValue(changeEvent.target.value)
                }}
                className="ps-9"
                placeholder={translateSignUp(
                  "form.fields.passwordConfirmation.placeholder",
                )}
                aria-invalid={
                  isSignUpErrorVisible && !passwordConfirmationValue
                }
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Lock className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
          </div>

          <label
            htmlFor="accept-terms"
            className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 p-3 text-sm text-slate-700"
          >
            <input
              id="accept-terms"
              name="acceptTerms"
              type="checkbox"
              checked={hasAcceptedTerms}
              onChange={(changeEvent) => {
                setHasAcceptedTerms(changeEvent.target.checked)
              }}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand-cta"
            />
            <span>{translateSignUp("form.fields.acceptTerms")}</span>
          </label>

          <Button type="submit" className="w-full">
            {translateSignUp("form.actions.submit")}
          </Button>

          <p className="text-center text-sm text-slate-600">
            {translateSignUp("form.actions.hasAccount")}{" "}
            <Link
              href="/connexion"
              className="font-medium text-brand-cta hover:underline"
            >
              {translateSignUp("form.actions.goToSignIn")}
            </Link>
          </p>

          {!isSignUpSuccessful && isSignUpErrorVisible ? (
            <p className="text-xs text-brand-error">
              {translateSignUp("form.messages.errorHint")}
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </AuthPageSection>
  )
}
