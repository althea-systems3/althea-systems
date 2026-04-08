"use client"

import { createClient } from "@supabase/supabase-js"
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CreditCard,
  Loader2,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { useLocale } from "next-intl"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCartData } from "@/features/cart/useCartData"
import {
  AUTHENTICATION_STORAGE_KEY,
  AUTHENTICATION_UPDATED_EVENT_NAME,
} from "@/features/layout/layoutConstants"
import { Link, useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import {
  CheckoutPageBlockedState,
  CheckoutPageErrorState,
  CheckoutPageLoadingState,
} from "./CheckoutPageStates"
import type {
  CheckoutAddressForm,
  CheckoutAuthMode,
  CheckoutAuthUser,
  CheckoutConfirmResponse,
  CheckoutPaymentForm,
  CheckoutSavedAddress,
  CheckoutSavedPaymentMethod,
  CheckoutStepId,
} from "./checkoutTypes"
import {
  formatCheckoutPrice,
  getCardLast4,
  getInitialAddressForm,
  getInitialPaymentForm,
  hasCartStockConflict,
  hasValidationErrors,
  isValidEmail,
  validateAddressForm,
  validatePaymentForm,
} from "./checkoutUtils"

type AddressMode = "saved" | "new"
type PaymentMode = "saved" | "new"

type CheckoutStepDefinition = {
  id: CheckoutStepId
  label: string
  icon: typeof UserRound
}

const CHECKOUT_STEPS: CheckoutStepDefinition[] = [
  { id: 1, label: "Connexion", icon: UserRound },
  { id: 2, label: "Adresse", icon: MapPin },
  { id: 3, label: "Paiement", icon: CreditCard },
  { id: 4, label: "Confirmation", icon: ShieldCheck },
]

function getInitialAuthMode(isAuthenticated: boolean): CheckoutAuthMode {
  if (isAuthenticated) {
    return "guest"
  }

  return "guest"
}

function splitFullName(fullName: string): {
  firstName: string
  lastName: string
} {
  const trimmed = fullName.trim()

  if (!trimmed) {
    return {
      firstName: "",
      lastName: "",
    }
  }

  const [firstName, ...remaining] = trimmed.split(" ")

  return {
    firstName,
    lastName: remaining.join(" "),
  }
}

function formatAddressSummary(address: CheckoutAddressForm): string {
  const summaryParts = [
    `${address.firstName} ${address.lastName}`.trim(),
    address.address1,
    address.address2,
    `${address.postalCode} ${address.city}`.trim(),
    address.region,
    address.country,
    address.phone,
  ]

  return summaryParts.filter(Boolean).join(" - ")
}

function maskCard(last4: string): string {
  return `**** **** **** ${last4}`
}

function syncAuthenticationInLayout(isAuthenticated: boolean): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    AUTHENTICATION_STORAGE_KEY,
    isAuthenticated ? "true" : "false",
  )
  window.dispatchEvent(new Event(AUTHENTICATION_UPDATED_EVENT_NAME))
}

export function CheckoutPage() {
  const locale = useLocale()
  const router = useRouter()

  const { cart, isCartLoading, hasCartError, reloadCart } = useCartData()

  const [currentStep, setCurrentStep] = useState<CheckoutStepId>(1)
  const [maxReachedStep, setMaxReachedStep] = useState<CheckoutStepId>(1)

  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authUser, setAuthUser] = useState<CheckoutAuthUser | null>(null)
  const [authMode, setAuthMode] = useState<CheckoutAuthMode>("guest")

  const [guestEmail, setGuestEmail] = useState("")
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  const [signUpFullName, setSignUpFullName] = useState("")
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState("")

  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null)
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(
    null,
  )

  const [savedAddresses, setSavedAddresses] = useState<CheckoutSavedAddress[]>(
    [],
  )
  const [isAddressLoading, setIsAddressLoading] = useState(false)
  const [addressMode, setAddressMode] = useState<AddressMode>("new")
  const [selectedAddressId, setSelectedAddressId] = useState("")
  const [addressForm, setAddressForm] = useState<CheckoutAddressForm>(
    getInitialAddressForm(),
  )
  const [addressErrors, setAddressErrors] = useState<
    Partial<Record<keyof CheckoutAddressForm, string>>
  >({})
  const [addressStepError, setAddressStepError] = useState<string | null>(null)

  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    CheckoutSavedPaymentMethod[]
  >([])
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("new")
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("")
  const [paymentForm, setPaymentForm] = useState<CheckoutPaymentForm>(
    getInitialPaymentForm(),
  )
  const [paymentErrors, setPaymentErrors] = useState<
    Partial<Record<keyof CheckoutPaymentForm, string>>
  >({})
  const [paymentStepError, setPaymentStepError] = useState<string | null>(null)

  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false)

  const supabaseBrowserClient = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return null
    }

    return createClient(supabaseUrl, supabaseAnonKey)
  }, [])

  const stockConflict = hasCartStockConflict(cart)
  const isCartEmpty = !isCartLoading && cart.lines.length === 0

  const totalHtEstimate = useMemo(() => {
    const htValue = cart.totalTtc / 1.2
    return Math.round(htValue * 100) / 100
  }, [cart.totalTtc])

  const totalTvaEstimate = useMemo(() => {
    return Math.round((cart.totalTtc - totalHtEstimate) * 100) / 100
  }, [cart.totalTtc, totalHtEstimate])

  const refreshAuthUser =
    useCallback(async (): Promise<CheckoutAuthUser | null> => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        })

        if (!response.ok) {
          setAuthUser(null)
          syncAuthenticationInLayout(false)
          return null
        }

        const payload = await response.json()

        if (!payload?.isAuthenticated || !payload?.user) {
          setAuthUser(null)
          syncAuthenticationInLayout(false)
          return null
        }

        const nextUser: CheckoutAuthUser = {
          id: payload.user.id,
          email: payload.user.email,
          fullName: payload.user.nomComplet ?? "",
        }

        setAuthUser(nextUser)
        setGuestEmail(nextUser.email)
        syncAuthenticationInLayout(true)

        return nextUser
      } catch (error) {
        console.error("Erreur chargement session checkout", { error })
        setAuthUser(null)
        syncAuthenticationInLayout(false)
        return null
      }
    }, [])

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      setIsAuthLoading(true)
      const user = await refreshAuthUser()

      if (!isMounted) {
        return
      }

      setAuthMode(getInitialAuthMode(Boolean(user)))
      setIsAuthLoading(false)
    }

    void loadSession()

    return () => {
      isMounted = false
    }
  }, [refreshAuthUser])

  useEffect(() => {
    if (authUser) {
      const splitName = splitFullName(authUser.fullName)

      setAddressForm((current) => ({
        ...current,
        firstName: current.firstName || splitName.firstName,
        lastName: current.lastName || splitName.lastName,
      }))
    }
  }, [authUser])

  useEffect(() => {
    if (!authUser) {
      setSavedAddresses([])
      setAddressMode("new")
      setSelectedAddressId("")
      return
    }

    let isMounted = true

    const loadAddresses = async () => {
      setIsAddressLoading(true)

      try {
        const response = await fetch("/api/checkout/addresses", {
          method: "GET",
          cache: "no-store",
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload) {
          setSavedAddresses([])
          setAddressMode("new")
          setSelectedAddressId("")
          return
        }

        const addresses = Array.isArray(payload.addresses)
          ? (payload.addresses as CheckoutSavedAddress[]).map((address) => ({
              ...address,
              region: address.region ?? "",
            }))
          : []

        if (!isMounted) {
          return
        }

        setSavedAddresses(addresses)

        if (addresses.length > 0) {
          setAddressMode("saved")
          setSelectedAddressId(addresses[0].id)
        } else {
          setAddressMode("new")
          setSelectedAddressId("")
        }
      } catch (error) {
        console.error("Erreur chargement adresses checkout", { error })

        if (isMounted) {
          setSavedAddresses([])
          setAddressMode("new")
          setSelectedAddressId("")
        }
      } finally {
        if (isMounted) {
          setIsAddressLoading(false)
        }
      }
    }

    void loadAddresses()

    return () => {
      isMounted = false
    }
  }, [authUser])

  useEffect(() => {
    if (!authUser) {
      setSavedPaymentMethods([])
      setPaymentMode("new")
      setSelectedPaymentMethodId("")
      return
    }

    let isMounted = true

    const loadPaymentMethods = async () => {
      setIsPaymentLoading(true)

      try {
        const response = await fetch("/api/checkout/payment-methods", {
          method: "GET",
          cache: "no-store",
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload) {
          setSavedPaymentMethods([])
          setPaymentMode("new")
          setSelectedPaymentMethodId("")
          return
        }

        const paymentMethods = Array.isArray(payload.paymentMethods)
          ? (payload.paymentMethods as CheckoutSavedPaymentMethod[])
          : []

        if (!isMounted) {
          return
        }

        setSavedPaymentMethods(paymentMethods)

        if (paymentMethods.length > 0) {
          setPaymentMode("saved")
          setSelectedPaymentMethodId(paymentMethods[0].id)
        } else {
          setPaymentMode("new")
          setSelectedPaymentMethodId("")
        }
      } catch (error) {
        console.error("Erreur chargement moyens de paiement checkout", {
          error,
        })

        if (isMounted) {
          setSavedPaymentMethods([])
          setPaymentMode("new")
          setSelectedPaymentMethodId("")
        }
      } finally {
        if (isMounted) {
          setIsPaymentLoading(false)
        }
      }
    }

    void loadPaymentMethods()

    return () => {
      isMounted = false
    }
  }, [authUser])

  useEffect(() => {
    if (!isCartEmpty) {
      return
    }

    router.replace("/panier")
  }, [isCartEmpty, router])

  const selectedSavedAddress = useMemo(() => {
    return (
      savedAddresses.find((address) => address.id === selectedAddressId) ?? null
    )
  }, [savedAddresses, selectedAddressId])

  const selectedSavedPaymentMethod = useMemo(() => {
    return (
      savedPaymentMethods.find(
        (payment) => payment.id === selectedPaymentMethodId,
      ) ?? null
    )
  }, [savedPaymentMethods, selectedPaymentMethodId])

  const effectiveAddressPreview = useMemo((): CheckoutAddressForm => {
    if (addressMode === "saved" && selectedSavedAddress) {
      return {
        firstName: selectedSavedAddress.firstName,
        lastName: selectedSavedAddress.lastName,
        address1: selectedSavedAddress.address1,
        address2: selectedSavedAddress.address2,
        city: selectedSavedAddress.city,
        region: selectedSavedAddress.region,
        postalCode: selectedSavedAddress.postalCode,
        country: selectedSavedAddress.country,
        phone: selectedSavedAddress.phone,
      }
    }

    return addressForm
  }, [addressForm, addressMode, selectedSavedAddress])

  const paymentPreview = useMemo(() => {
    if (paymentMode === "saved" && selectedSavedPaymentMethod) {
      return {
        cardHolder: selectedSavedPaymentMethod.cardHolder,
        last4: selectedSavedPaymentMethod.last4,
        expiry: selectedSavedPaymentMethod.expiry,
      }
    }

    return {
      cardHolder: paymentForm.cardHolder,
      last4: getCardLast4(paymentForm.cardNumber),
      expiry: paymentForm.expiry,
    }
  }, [paymentForm, paymentMode, selectedSavedPaymentMethod])

  const goToStep = (step: CheckoutStepId) => {
    setCurrentStep(step)
    setMaxReachedStep((current) => (step > current ? step : current))
  }

  const handleStepSelection = (step: CheckoutStepId) => {
    if (step > maxReachedStep && step > currentStep) {
      return
    }

    setCurrentStep(step)
  }

  const handleContinueAsGuest = () => {
    setAuthErrorMessage(null)
    setAuthSuccessMessage(null)

    if (!isValidEmail(guestEmail)) {
      setAuthErrorMessage("Veuillez saisir un e-mail invite valide.")
      return
    }

    setAuthSuccessMessage("Mode invite active pour ce checkout.")
    goToStep(2)
  }

  const handleSignInAndContinue = async () => {
    setAuthErrorMessage(null)
    setAuthSuccessMessage(null)

    if (!isValidEmail(signInEmail)) {
      setAuthErrorMessage("Adresse e-mail de connexion invalide.")
      return
    }

    if (!signInPassword.trim()) {
      setAuthErrorMessage("Le mot de passe est obligatoire pour la connexion.")
      return
    }

    if (!supabaseBrowserClient) {
      setAuthErrorMessage(
        "Configuration d'authentification indisponible. Utilisez la page connexion.",
      )
      return
    }

    setIsAuthSubmitting(true)

    try {
      const { error } = await supabaseBrowserClient.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      })

      if (error) {
        setAuthErrorMessage(error.message)
        return
      }

      const connectedUser = await refreshAuthUser()

      if (!connectedUser) {
        setAuthErrorMessage(
          "Connexion effectuee mais session utilisateur indisponible. Reessayez.",
        )
        return
      }

      setAuthSuccessMessage("Connexion reussie.")
      goToStep(2)
    } catch (error) {
      console.error("Erreur connexion checkout", { error })
      setAuthErrorMessage("Impossible de vous connecter pour le moment.")
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleSignUpAndContinue = async () => {
    setAuthErrorMessage(null)
    setAuthSuccessMessage(null)

    if (!signUpFullName.trim()) {
      setAuthErrorMessage("Le nom complet est obligatoire.")
      return
    }

    if (!isValidEmail(signUpEmail)) {
      setAuthErrorMessage("Adresse e-mail d'inscription invalide.")
      return
    }

    if (!signUpPassword.trim() || signUpPassword.length < 8) {
      setAuthErrorMessage(
        "Le mot de passe doit contenir au moins 8 caracteres.",
      )
      return
    }

    if (signUpPassword !== signUpPasswordConfirm) {
      setAuthErrorMessage("Les mots de passe ne correspondent pas.")
      return
    }

    if (!supabaseBrowserClient) {
      setAuthErrorMessage(
        "Configuration d'authentification indisponible. Utilisez la page inscription.",
      )
      return
    }

    setIsAuthSubmitting(true)

    try {
      const { data, error } = await supabaseBrowserClient.auth.signUp({
        email: signUpEmail.trim(),
        password: signUpPassword,
        options: {
          data: {
            full_name: signUpFullName.trim(),
          },
        },
      })

      if (error) {
        setAuthErrorMessage(error.message)
        return
      }

      const connectedUser = await refreshAuthUser()

      if (connectedUser || data.session) {
        setAuthSuccessMessage("Inscription reussie.")
        goToStep(2)
        return
      }

      setGuestEmail(signUpEmail.trim())
      setAuthMode("guest")
      setAuthSuccessMessage(
        "Compte cree. Continuez en invite et validez ensuite votre email.",
      )
      goToStep(2)
    } catch (error) {
      console.error("Erreur inscription checkout", { error })
      setAuthErrorMessage("Impossible de creer le compte pour le moment.")
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleAddressStepContinue = () => {
    setAddressStepError(null)

    if (stockConflict) {
      setAddressStepError(
        "Des produits sont indisponibles ou en conflit de stock. Corrigez le panier avant de continuer.",
      )
      return
    }

    if (addressMode === "saved") {
      if (!selectedAddressId) {
        setAddressStepError("Selectionnez une adresse enregistree.")
        return
      }

      goToStep(3)
      return
    }

    const nextAddressErrors = validateAddressForm(addressForm)
    setAddressErrors(nextAddressErrors)

    if (
      hasValidationErrors(
        nextAddressErrors as Record<string, string | undefined>,
      )
    ) {
      setAddressStepError(
        "Completez tous les champs obligatoires de l'adresse.",
      )
      return
    }

    goToStep(3)
  }

  const handlePaymentStepContinue = () => {
    setPaymentStepError(null)

    if (stockConflict) {
      setPaymentStepError(
        "Des produits sont indisponibles ou en conflit de stock. Corrigez le panier avant de continuer.",
      )
      return
    }

    if (paymentMode === "saved") {
      if (!selectedPaymentMethodId) {
        setPaymentStepError("Selectionnez un moyen de paiement enregistre.")
        return
      }

      goToStep(4)
      return
    }

    const nextPaymentErrors = validatePaymentForm(paymentForm)
    setPaymentErrors(nextPaymentErrors)

    if (
      hasValidationErrors(
        nextPaymentErrors as Record<string, string | undefined>,
      )
    ) {
      setPaymentStepError("Verifiez les informations de carte bancaire.")
      return
    }

    goToStep(4)
  }

  const handleConfirmPurchase = async () => {
    setCheckoutError(null)

    if (stockConflict) {
      setCheckoutError(
        "Finalisation bloquee: certains produits ne sont plus disponibles.",
      )
      return
    }

    const addressPayload =
      addressMode === "saved" && selectedAddressId
        ? {
            savedAddressId: selectedAddressId,
          }
        : addressForm

    const paymentPayload =
      paymentMode === "saved" && selectedPaymentMethodId
        ? {
            savedPaymentId: selectedPaymentMethodId,
          }
        : paymentForm

    setIsConfirmingOrder(true)

    try {
      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guestEmail: authUser ? undefined : guestEmail.trim(),
          address: addressPayload,
          payment: paymentPayload,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        const backendMessage =
          typeof payload?.error === "string" ? payload.error : null

        setCheckoutError(
          backendMessage ??
            "La confirmation de commande a echoue. Veuillez reessayer.",
        )
        return
      }

      const confirmation = payload as CheckoutConfirmResponse

      syncAuthenticationInLayout(Boolean(authUser))

      router.replace(`/checkout/confirmation?order=${confirmation.orderNumber}`)
    } catch (error) {
      console.error("Erreur confirmation checkout", { error })
      setCheckoutError("Impossible de finaliser votre commande actuellement.")
    } finally {
      setIsConfirmingOrder(false)
    }
  }

  if (isCartLoading || isAuthLoading) {
    return <CheckoutPageLoadingState />
  }

  if (hasCartError) {
    return <CheckoutPageErrorState onRetry={() => reloadCart()} />
  }

  if (isCartEmpty) {
    return <CheckoutPageBlockedState />
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-font text-2xl text-brand-nav sm:text-3xl md:text-4xl">
          Checkout multi-etapes
        </h1>
        <p className="max-w-3xl text-sm text-slate-700 sm:text-base">
          Finalisez votre commande en 4 etapes: compte, adresse, paiement et
          confirmation.
        </p>
      </header>

      {stockConflict ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-brand-alert/40 bg-brand-alert/10 px-3 py-2 text-sm text-brand-nav"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand-alert" />
          <p>
            Votre panier contient des produits indisponibles ou en conflit de
            stock. Corrigez-les avant de finaliser l&apos;achat.
          </p>
        </div>
      ) : null}

      <nav
        aria-label="Progression checkout"
        className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
      >
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {CHECKOUT_STEPS.map((step) => {
            const isCurrent = step.id === currentStep
            const isDone = step.id < currentStep
            const canSelect = step.id <= maxReachedStep || step.id < currentStep

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => handleStepSelection(step.id)}
                  disabled={!canSelect}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isCurrent
                      ? "border-brand-cta bg-brand-cta/10 text-brand-nav"
                      : isDone
                        ? "border-brand-success/40 bg-brand-success/10 text-brand-nav"
                        : "border-slate-200 bg-white text-slate-600",
                    !canSelect && "cursor-not-allowed opacity-60",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2
                      className="size-4 text-brand-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <step.icon
                      className={cn(
                        "size-4",
                        isCurrent ? "text-brand-cta" : "text-slate-500",
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    Etape {step.id}: {step.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="heading-font text-xl text-brand-nav">
              {currentStep === 1 &&
                "Etape 1 — Connexion / Inscription / Invite"}
              {currentStep === 2 &&
                "Etape 2 — Adresse de livraison/facturation"}
              {currentStep === 3 && "Etape 3 — Informations de paiement"}
              {currentStep === 4 && "Etape 4 — Confirmation"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {currentStep === 1 ? (
              <section
                className="space-y-4"
                aria-label="Etape connexion checkout"
              >
                {authUser ? (
                  <div className="rounded-lg border border-brand-success/40 bg-brand-success/10 p-3 text-sm text-brand-nav">
                    <p className="font-semibold">Session connectee</p>
                    <p>
                      Vous etes connecte en tant que {authUser.email}. Vous
                      pouvez poursuivre le checkout.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button
                        type="button"
                        variant={authMode === "guest" ? "default" : "outline"}
                        className={cn(
                          authMode === "guest" &&
                            "bg-brand-cta text-white hover:bg-brand-cta/90",
                        )}
                        onClick={() => {
                          setAuthMode("guest")
                          setAuthErrorMessage(null)
                          setAuthSuccessMessage(null)
                        }}
                      >
                        Invite
                      </Button>
                      <Button
                        type="button"
                        variant={authMode === "signIn" ? "default" : "outline"}
                        className={cn(
                          authMode === "signIn" &&
                            "bg-brand-cta text-white hover:bg-brand-cta/90",
                        )}
                        onClick={() => {
                          setAuthMode("signIn")
                          setAuthErrorMessage(null)
                          setAuthSuccessMessage(null)
                        }}
                      >
                        Connexion
                      </Button>
                      <Button
                        type="button"
                        variant={authMode === "signUp" ? "default" : "outline"}
                        className={cn(
                          authMode === "signUp" &&
                            "bg-brand-cta text-white hover:bg-brand-cta/90",
                        )}
                        onClick={() => {
                          setAuthMode("signUp")
                          setAuthErrorMessage(null)
                          setAuthSuccessMessage(null)
                        }}
                      >
                        Inscription rapide
                      </Button>
                    </div>

                    {authMode === "guest" ? (
                      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <p className="text-sm text-slate-700">
                          Continuez sans compte en renseignant un e-mail de
                          contact.
                        </p>
                        <div className="space-y-1">
                          <label
                            htmlFor="checkout-guest-email"
                            className="text-sm font-medium text-brand-nav"
                          >
                            E-mail invite
                          </label>
                          <input
                            id="checkout-guest-email"
                            type="email"
                            autoComplete="email"
                            value={guestEmail}
                            onChange={(event) =>
                              setGuestEmail(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                          />
                        </div>
                        <Button
                          type="button"
                          className="bg-brand-cta text-white hover:bg-brand-cta/90"
                          onClick={handleContinueAsGuest}
                        >
                          Continuer en invite
                        </Button>
                      </div>
                    ) : null}

                    {authMode === "signIn" ? (
                      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <div className="space-y-1">
                          <label
                            htmlFor="checkout-signin-email"
                            className="text-sm font-medium text-brand-nav"
                          >
                            E-mail
                          </label>
                          <input
                            id="checkout-signin-email"
                            type="email"
                            autoComplete="email"
                            value={signInEmail}
                            onChange={(event) =>
                              setSignInEmail(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label
                            htmlFor="checkout-signin-password"
                            className="text-sm font-medium text-brand-nav"
                          >
                            Mot de passe
                          </label>
                          <input
                            id="checkout-signin-password"
                            type="password"
                            autoComplete="current-password"
                            value={signInPassword}
                            onChange={(event) =>
                              setSignInPassword(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="bg-brand-cta text-white hover:bg-brand-cta/90"
                            onClick={() => void handleSignInAndContinue()}
                            disabled={isAuthSubmitting}
                          >
                            {isAuthSubmitting ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Connexion...
                              </>
                            ) : (
                              "Se connecter et continuer"
                            )}
                          </Button>
                          <Button type="button" variant="outline" asChild>
                            <Link href="/connexion">
                              Ouvrir la page connexion
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {authMode === "signUp" ? (
                      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <div className="space-y-1">
                          <label
                            htmlFor="checkout-signup-name"
                            className="text-sm font-medium text-brand-nav"
                          >
                            Nom complet
                          </label>
                          <input
                            id="checkout-signup-name"
                            type="text"
                            autoComplete="name"
                            value={signUpFullName}
                            onChange={(event) =>
                              setSignUpFullName(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label
                            htmlFor="checkout-signup-email"
                            className="text-sm font-medium text-brand-nav"
                          >
                            E-mail
                          </label>
                          <input
                            id="checkout-signup-email"
                            type="email"
                            autoComplete="email"
                            value={signUpEmail}
                            onChange={(event) =>
                              setSignUpEmail(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label
                              htmlFor="checkout-signup-password"
                              className="text-sm font-medium text-brand-nav"
                            >
                              Mot de passe
                            </label>
                            <input
                              id="checkout-signup-password"
                              type="password"
                              autoComplete="new-password"
                              value={signUpPassword}
                              onChange={(event) =>
                                setSignUpPassword(event.target.value)
                              }
                              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                            />
                          </div>
                          <div className="space-y-1">
                            <label
                              htmlFor="checkout-signup-password-confirm"
                              className="text-sm font-medium text-brand-nav"
                            >
                              Confirmation mot de passe
                            </label>
                            <input
                              id="checkout-signup-password-confirm"
                              type="password"
                              autoComplete="new-password"
                              value={signUpPasswordConfirm}
                              onChange={(event) =>
                                setSignUpPasswordConfirm(event.target.value)
                              }
                              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="bg-brand-cta text-white hover:bg-brand-cta/90"
                            onClick={() => void handleSignUpAndContinue()}
                            disabled={isAuthSubmitting}
                          >
                            {isAuthSubmitting ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Inscription...
                              </>
                            ) : (
                              "S'inscrire et continuer"
                            )}
                          </Button>
                          <Button type="button" variant="outline" asChild>
                            <Link href="/inscription?source=checkout&next=/checkout">
                              Ouvrir la page inscription
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

                {authUser ? (
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      className="bg-brand-cta text-white hover:bg-brand-cta/90"
                      onClick={() => goToStep(2)}
                    >
                      Continuer vers l&apos;adresse
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {currentStep === 2 ? (
              <section
                className="space-y-4"
                aria-label="Etape adresse checkout"
              >
                {authUser && savedAddresses.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant={
                          addressMode === "saved" ? "default" : "outline"
                        }
                        className={cn(
                          addressMode === "saved" &&
                            "bg-brand-cta text-white hover:bg-brand-cta/90",
                        )}
                        onClick={() => setAddressMode("saved")}
                      >
                        Adresse enregistree
                      </Button>
                      <Button
                        type="button"
                        variant={addressMode === "new" ? "default" : "outline"}
                        className={cn(
                          addressMode === "new" &&
                            "bg-brand-cta text-white hover:bg-brand-cta/90",
                        )}
                        onClick={() => setAddressMode("new")}
                      >
                        Nouvelle adresse
                      </Button>
                    </div>

                    {addressMode === "saved" ? (
                      <fieldset
                        className="space-y-2"
                        aria-label="Selection adresse enregistree"
                      >
                        {savedAddresses.map((address) => (
                          <label
                            key={address.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm",
                              selectedAddressId === address.id
                                ? "border-brand-cta bg-brand-cta/10"
                                : "border-slate-200",
                            )}
                          >
                            <input
                              type="radio"
                              name="saved-address"
                              checked={selectedAddressId === address.id}
                              onChange={() => setSelectedAddressId(address.id)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-cta"
                            />
                            <span>{formatAddressSummary(address)}</span>
                          </label>
                        ))}
                      </fieldset>
                    ) : null}
                  </div>
                ) : null}

                {addressMode === "new" || savedAddresses.length === 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-first-name"
                      >
                        Prenom
                      </label>
                      <input
                        id="checkout-address-first-name"
                        value={addressForm.firstName}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {addressErrors.firstName ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-last-name"
                      >
                        Nom
                      </label>
                      <input
                        id="checkout-address-last-name"
                        value={addressForm.lastName}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {addressErrors.lastName ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-1"
                      >
                        Adresse 1
                      </label>
                      <input
                        id="checkout-address-1"
                        value={addressForm.address1}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            address1: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {addressErrors.address1 ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-2"
                      >
                        Adresse 2 (optionnel)
                      </label>
                      <input
                        id="checkout-address-2"
                        value={addressForm.address2}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            address2: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-city"
                      >
                        Ville
                      </label>
                      <input
                        id="checkout-address-city"
                        value={addressForm.city}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {addressErrors.city ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-region"
                      >
                        Region
                      </label>
                      <input
                        id="checkout-address-region"
                        value={addressForm.region}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            region: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {addressErrors.region ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-postal-code"
                      >
                        Code postal
                      </label>
                      <input
                        id="checkout-address-postal-code"
                        value={addressForm.postalCode}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            postalCode: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {addressErrors.postalCode ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-country"
                      >
                        Pays
                      </label>
                      <input
                        id="checkout-address-country"
                        value={addressForm.country}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            country: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {addressErrors.country ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-address-phone"
                      >
                        Telephone mobile
                      </label>
                      <input
                        id="checkout-address-phone"
                        value={addressForm.phone}
                        onChange={(event) =>
                          setAddressForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {addressErrors.phone ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {addressStepError ? (
                  <p className="text-sm text-brand-error" role="alert">
                    {addressStepError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="bg-brand-cta text-white hover:bg-brand-cta/90"
                    onClick={handleAddressStepContinue}
                    disabled={isAddressLoading}
                  >
                    {isAddressLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      "Continuer vers le paiement"
                    )}
                  </Button>
                </div>
              </section>
            ) : null}

            {currentStep === 3 ? (
              <section
                className="space-y-4"
                aria-label="Etape paiement checkout"
              >
                {authUser && savedPaymentMethods.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant={
                          paymentMode === "saved" ? "default" : "outline"
                        }
                        className={cn(
                          paymentMode === "saved" &&
                            "bg-brand-cta text-white hover:bg-brand-cta/90",
                        )}
                        onClick={() => setPaymentMode("saved")}
                      >
                        Carte enregistree
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMode === "new" ? "default" : "outline"}
                        className={cn(
                          paymentMode === "new" &&
                            "bg-brand-cta text-white hover:bg-brand-cta/90",
                        )}
                        onClick={() => setPaymentMode("new")}
                      >
                        Nouvelle carte
                      </Button>
                    </div>

                    {paymentMode === "saved" ? (
                      <fieldset
                        className="space-y-2"
                        aria-label="Selection carte enregistree"
                      >
                        {savedPaymentMethods.map((payment) => (
                          <label
                            key={payment.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm",
                              selectedPaymentMethodId === payment.id
                                ? "border-brand-cta bg-brand-cta/10"
                                : "border-slate-200",
                            )}
                          >
                            <input
                              type="radio"
                              name="saved-payment-method"
                              checked={selectedPaymentMethodId === payment.id}
                              onChange={() =>
                                setSelectedPaymentMethodId(payment.id)
                              }
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-cta"
                            />
                            <span>
                              {payment.cardHolder} - {maskCard(payment.last4)} -{" "}
                              {payment.expiry}
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    ) : null}
                  </div>
                ) : null}

                {paymentMode === "new" || savedPaymentMethods.length === 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-payment-card-holder"
                      >
                        Nom sur la carte
                      </label>
                      <input
                        id="checkout-payment-card-holder"
                        value={paymentForm.cardHolder}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            cardHolder: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                      />
                      {paymentErrors.cardHolder ? (
                        <p className="text-xs text-brand-error">
                          Champ requis.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-payment-card-number"
                      >
                        Numero de carte
                      </label>
                      <input
                        id="checkout-payment-card-number"
                        type="password"
                        inputMode="numeric"
                        value={paymentForm.cardNumber}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            cardNumber: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                        placeholder="************1234"
                      />
                      {paymentErrors.cardNumber ? (
                        <p className="text-xs text-brand-error">
                          Numero de carte invalide.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-payment-expiry"
                      >
                        Expiration (MM/AA)
                      </label>
                      <input
                        id="checkout-payment-expiry"
                        value={paymentForm.expiry}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            expiry: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                        placeholder="MM/AA"
                      />
                      {paymentErrors.expiry ? (
                        <p className="text-xs text-brand-error">
                          Expiration invalide.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-medium text-brand-nav"
                        htmlFor="checkout-payment-cvc"
                      >
                        CVC
                      </label>
                      <input
                        id="checkout-payment-cvc"
                        type="password"
                        inputMode="numeric"
                        value={paymentForm.cvc}
                        onChange={(event) =>
                          setPaymentForm((current) => ({
                            ...current,
                            cvc: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
                        placeholder="***"
                      />
                      {paymentErrors.cvc ? (
                        <p className="text-xs text-brand-error">
                          CVC invalide.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {paymentStepError ? (
                  <p className="text-sm text-brand-error" role="alert">
                    {paymentStepError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="bg-brand-cta text-white hover:bg-brand-cta/90"
                    onClick={handlePaymentStepContinue}
                    disabled={isPaymentLoading}
                  >
                    {isPaymentLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      "Continuer vers la confirmation"
                    )}
                  </Button>
                </div>
              </section>
            ) : null}

            {currentStep === 4 ? (
              <section
                className="space-y-4"
                aria-label="Etape confirmation checkout"
              >
                <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <h3 className="heading-font text-base text-brand-nav">
                    Recapitulatif des produits
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {cart.lines.map((line) => (
                      <li
                        key={line.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-b-0"
                      >
                        <span>
                          {line.name} x {line.quantity}
                        </span>
                        <span className="font-semibold text-brand-nav">
                          {formatCheckoutPrice(line.subtotalTtc, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <h3 className="heading-font text-base text-brand-nav">
                    Adresse selectionnee
                  </h3>
                  <p className="text-sm text-slate-700">
                    {formatAddressSummary(effectiveAddressPreview)}
                  </p>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <h3 className="heading-font text-base text-brand-nav">
                    Moyen de paiement
                  </h3>
                  <p className="text-sm text-slate-700">
                    {paymentPreview.cardHolder || "Carte"} -{" "}
                    {maskCard(paymentPreview.last4)} -{" "}
                    {paymentPreview.expiry || "--/--"}
                  </p>
                </div>

                {checkoutError ? (
                  <p className="text-sm text-brand-error" role="alert">
                    {checkoutError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="bg-brand-cta text-white hover:bg-brand-cta/90"
                    onClick={() => void handleConfirmPurchase()}
                    disabled={isConfirmingOrder || stockConflict}
                  >
                    {isConfirmingOrder ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Confirmation en cours...
                      </>
                    ) : (
                      "Confirmer l'achat"
                    )}
                  </Button>
                </div>
              </section>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm lg:sticky lg:top-24">
          <CardHeader className="pb-3">
            <CardTitle className="heading-font text-xl text-brand-nav">
              Recapitulatif panier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-700">
              {cart.lines.map((line) => (
                <li
                  key={`summary-${line.id}`}
                  className="space-y-1 rounded-md border border-slate-100 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-brand-nav">{line.name}</p>
                    <p className="font-semibold text-brand-nav">
                      {formatCheckoutPrice(line.subtotalTtc, locale)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span>Quantite: {line.quantity}</span>
                    {line.isAvailable && line.isStockSufficient ? (
                      <span className="inline-flex items-center gap-1 text-brand-success">
                        <Circle className="size-2 fill-brand-success text-brand-success" />
                        Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-brand-error">
                        <Circle className="size-2 fill-brand-error text-brand-error" />
                        Conflit stock
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-slate-100 pt-3 text-sm">
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <dt>Articles</dt>
                <dd>{cart.totalItems}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <dt>Total HT (estime)</dt>
                <dd>{formatCheckoutPrice(totalHtEstimate, locale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <dt>TVA (estimee)</dt>
                <dd>{formatCheckoutPrice(totalTvaEstimate, locale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 text-brand-nav">
                <dt className="heading-font text-base">Total TTC</dt>
                <dd className="heading-font text-lg">
                  {formatCheckoutPrice(cart.totalTtc, locale)}
                </dd>
              </div>
            </dl>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void reloadCart({ silent: true })}
            >
              Actualiser le panier
            </Button>

            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href="/panier">Retour au panier</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
