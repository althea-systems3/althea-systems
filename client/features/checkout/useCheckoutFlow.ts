"use client"

import { createClient } from "@supabase/supabase-js"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useCartData } from "@/features/cart/useCartData"
import {
  AUTHENTICATION_STORAGE_KEY,
  AUTHENTICATION_UPDATED_EVENT_NAME,
} from "@/features/layout/layoutConstants"
import { useRouter } from "@/i18n/navigation"
import { secureFetch } from "@/lib/http/secureFetch"

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
  getCardLast4,
  getInitialAddressForm,
  getInitialPaymentForm,
  hasCartStockConflict,
  hasValidationErrors,
  isValidEmail,
  validateAddressForm,
  validatePaymentForm,
} from "./checkoutUtils"

export type AddressMode = "saved" | "new"
export type PaymentMode = "saved" | "new"

function splitFullName(fullName: string): {
  firstName: string
  lastName: string
} {
  const trimmed = fullName.trim()
  if (!trimmed) return { firstName: "", lastName: "" }
  const [firstName, ...rest] = trimmed.split(" ")
  return { firstName, lastName: rest.join(" ") }
}

function syncAuthenticationInLayout(isAuthenticated: boolean): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    AUTHENTICATION_STORAGE_KEY,
    isAuthenticated ? "true" : "false",
  )
  window.dispatchEvent(new Event(AUTHENTICATION_UPDATED_EVENT_NAME))
}

export type CheckoutFlowErrorKeys =
  | "guestEmailInvalid"
  | "signInEmailInvalid"
  | "passwordRequired"
  | "authConfigUnavailableSignIn"
  | "sessionUnavailableAfterSignIn"
  | "signInFailed"
  | "fullNameRequired"
  | "signUpEmailInvalid"
  | "passwordTooShort"
  | "passwordMismatch"
  | "authConfigUnavailableSignUp"
  | "signUpFailed"

export type CheckoutFlowSuccessKeys =
  | "guestModeActive"
  | "signIn"
  | "signUp"
  | "signUpContinueAsGuest"

export type CheckoutFlow = ReturnType<typeof useCheckoutFlow>

export function useCheckoutFlow() {
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
  const [authErrorKey, setAuthErrorKey] =
    useState<CheckoutFlowErrorKeys | string | null>(null)
  const [authSuccessKey, setAuthSuccessKey] =
    useState<CheckoutFlowSuccessKeys | null>(null)

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
  const [addressStepErrorKey, setAddressStepErrorKey] = useState<
    "stockConflict" | "selectSavedAddress" | "completeRequiredFields" | null
  >(null)

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
  const [paymentStepErrorKey, setPaymentStepErrorKey] = useState<
    "stockConflict" | "selectSavedMethod" | "invalidCardInformation" | null
  >(null)

  const [checkoutErrorKey, setCheckoutErrorKey] = useState<
    "stockConflict" | "confirmationFailed" | "finalizeFailed" | string | null
  >(null)
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false)

  const supabaseBrowserClient = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) return null
    return createClient(supabaseUrl, supabaseAnonKey)
  }, [])

  const stockConflict = hasCartStockConflict(cart)
  const isCartEmpty = !isCartLoading && cart.lines.length === 0

  const totalHtEstimate = useMemo(() => {
    return Math.round((cart.totalTtc / 1.2) * 100) / 100
  }, [cart.totalTtc])

  const totalTvaEstimate = useMemo(() => {
    return Math.round((cart.totalTtc - totalHtEstimate) * 100) / 100
  }, [cart.totalTtc, totalHtEstimate])

  const refreshAuthUser = useCallback(
    async (): Promise<CheckoutAuthUser | null> => {
      try {
        const response = await secureFetch("/api/auth/me", {
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
    },
    [],
  )

  useEffect(() => {
    let isMounted = true
    const loadSession = async () => {
      setIsAuthLoading(true)
      await refreshAuthUser()
      if (!isMounted) return
      setAuthMode("guest")
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
        const response = await secureFetch("/api/checkout/addresses", {
          method: "GET",
          cache: "no-store",
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload || !isMounted) return

        const addresses = Array.isArray(payload.addresses)
          ? (payload.addresses as CheckoutSavedAddress[]).map((address) => ({
              ...address,
              region: address.region ?? "",
            }))
          : []

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
        if (isMounted) setIsAddressLoading(false)
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
        const response = await secureFetch("/api/checkout/payment-methods", {
          method: "GET",
          cache: "no-store",
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload || !isMounted) return

        const paymentMethods = Array.isArray(payload.paymentMethods)
          ? (payload.paymentMethods as CheckoutSavedPaymentMethod[])
          : []

        setSavedPaymentMethods(paymentMethods)
        if (paymentMethods.length > 0) {
          setPaymentMode("saved")
          setSelectedPaymentMethodId(paymentMethods[0].id)
        } else {
          setPaymentMode("new")
          setSelectedPaymentMethodId("")
        }
      } catch (error) {
        console.error("Erreur chargement moyens de paiement checkout", { error })
        if (isMounted) {
          setSavedPaymentMethods([])
          setPaymentMode("new")
          setSelectedPaymentMethodId("")
        }
      } finally {
        if (isMounted) setIsPaymentLoading(false)
      }
    }

    void loadPaymentMethods()
    return () => {
      isMounted = false
    }
  }, [authUser])

  useEffect(() => {
    if (!isCartEmpty) return
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

  const goToStep = useCallback((step: CheckoutStepId) => {
    setCurrentStep(step)
    setMaxReachedStep((current) => (step > current ? step : current))
  }, [])

  const handleStepSelection = useCallback(
    (step: CheckoutStepId) => {
      if (step > maxReachedStep && step > currentStep) return
      setCurrentStep(step)
    },
    [currentStep, maxReachedStep],
  )

  const resetAuthMessages = useCallback(() => {
    setAuthErrorKey(null)
    setAuthSuccessKey(null)
  }, [])

  const handleContinueAsGuest = useCallback(() => {
    resetAuthMessages()
    if (!isValidEmail(guestEmail)) {
      setAuthErrorKey("guestEmailInvalid")
      return
    }
    setAuthSuccessKey("guestModeActive")
    goToStep(2)
  }, [goToStep, guestEmail, resetAuthMessages])

  const handleSignInAndContinue = useCallback(async () => {
    resetAuthMessages()

    if (!isValidEmail(signInEmail)) {
      setAuthErrorKey("signInEmailInvalid")
      return
    }
    if (!signInPassword.trim()) {
      setAuthErrorKey("passwordRequired")
      return
    }
    if (!supabaseBrowserClient) {
      setAuthErrorKey("authConfigUnavailableSignIn")
      return
    }

    setIsAuthSubmitting(true)
    try {
      const { error } = await supabaseBrowserClient.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      })
      if (error) {
        setAuthErrorKey(error.message)
        return
      }

      const connectedUser = await refreshAuthUser()
      if (!connectedUser) {
        setAuthErrorKey("sessionUnavailableAfterSignIn")
        return
      }

      setAuthSuccessKey("signIn")
      goToStep(2)
    } catch (error) {
      console.error("Erreur connexion checkout", { error })
      setAuthErrorKey("signInFailed")
    } finally {
      setIsAuthSubmitting(false)
    }
  }, [
    goToStep,
    refreshAuthUser,
    resetAuthMessages,
    signInEmail,
    signInPassword,
    supabaseBrowserClient,
  ])

  const handleSignUpAndContinue = useCallback(async () => {
    resetAuthMessages()

    if (!signUpFullName.trim()) {
      setAuthErrorKey("fullNameRequired")
      return
    }
    if (!isValidEmail(signUpEmail)) {
      setAuthErrorKey("signUpEmailInvalid")
      return
    }
    if (!signUpPassword.trim() || signUpPassword.length < 8) {
      setAuthErrorKey("passwordTooShort")
      return
    }
    if (signUpPassword !== signUpPasswordConfirm) {
      setAuthErrorKey("passwordMismatch")
      return
    }
    if (!supabaseBrowserClient) {
      setAuthErrorKey("authConfigUnavailableSignUp")
      return
    }

    setIsAuthSubmitting(true)
    try {
      const { data, error } = await supabaseBrowserClient.auth.signUp({
        email: signUpEmail.trim(),
        password: signUpPassword,
        options: { data: { full_name: signUpFullName.trim() } },
      })
      if (error) {
        setAuthErrorKey(error.message)
        return
      }

      const connectedUser = await refreshAuthUser()
      if (connectedUser || data.session) {
        setAuthSuccessKey("signUp")
        goToStep(2)
        return
      }

      setGuestEmail(signUpEmail.trim())
      setAuthMode("guest")
      setAuthSuccessKey("signUpContinueAsGuest")
      goToStep(2)
    } catch (error) {
      console.error("Erreur inscription checkout", { error })
      setAuthErrorKey("signUpFailed")
    } finally {
      setIsAuthSubmitting(false)
    }
  }, [
    goToStep,
    refreshAuthUser,
    resetAuthMessages,
    signUpEmail,
    signUpFullName,
    signUpPassword,
    signUpPasswordConfirm,
    supabaseBrowserClient,
  ])

  const handleAddressStepContinue = useCallback(() => {
    setAddressStepErrorKey(null)

    if (stockConflict) {
      setAddressStepErrorKey("stockConflict")
      return
    }

    if (addressMode === "saved") {
      if (!selectedAddressId) {
        setAddressStepErrorKey("selectSavedAddress")
        return
      }
      goToStep(3)
      return
    }

    const nextErrors = validateAddressForm(addressForm)
    setAddressErrors(nextErrors)
    if (hasValidationErrors(nextErrors as Record<string, string | undefined>)) {
      setAddressStepErrorKey("completeRequiredFields")
      return
    }

    goToStep(3)
  }, [addressForm, addressMode, goToStep, selectedAddressId, stockConflict])

  const handlePaymentStepContinue = useCallback(() => {
    setPaymentStepErrorKey(null)

    if (stockConflict) {
      setPaymentStepErrorKey("stockConflict")
      return
    }

    if (paymentMode === "saved") {
      if (!selectedPaymentMethodId) {
        setPaymentStepErrorKey("selectSavedMethod")
        return
      }
      goToStep(4)
      return
    }

    const nextErrors = validatePaymentForm(paymentForm)
    setPaymentErrors(nextErrors)
    if (hasValidationErrors(nextErrors as Record<string, string | undefined>)) {
      setPaymentStepErrorKey("invalidCardInformation")
      return
    }

    goToStep(4)
  }, [goToStep, paymentForm, paymentMode, selectedPaymentMethodId, stockConflict])

  const handleConfirmPurchase = useCallback(async () => {
    setCheckoutErrorKey(null)

    if (stockConflict) {
      setCheckoutErrorKey("stockConflict")
      return
    }

    const addressPayload =
      addressMode === "saved" && selectedAddressId
        ? { savedAddressId: selectedAddressId }
        : addressForm

    const paymentPayload =
      paymentMode === "saved" && selectedPaymentMethodId
        ? { savedPaymentId: selectedPaymentMethodId }
        : paymentForm

    setIsConfirmingOrder(true)
    try {
      const response = await secureFetch("/api/checkout/confirm", {
        method: "POST",
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
        setCheckoutErrorKey(backendMessage ?? "confirmationFailed")
        return
      }

      const confirmation = payload as CheckoutConfirmResponse
      syncAuthenticationInLayout(Boolean(authUser))
      router.replace(`/checkout/confirmation?order=${confirmation.orderNumber}`)
    } catch (error) {
      console.error("Erreur confirmation checkout", { error })
      setCheckoutErrorKey("finalizeFailed")
    } finally {
      setIsConfirmingOrder(false)
    }
  }, [
    addressForm,
    addressMode,
    authUser,
    guestEmail,
    paymentForm,
    paymentMode,
    router,
    selectedAddressId,
    selectedPaymentMethodId,
    stockConflict,
  ])

  return {
    // State flags
    cart,
    isCartLoading,
    hasCartError,
    reloadCart,
    isCartEmpty,
    isAuthLoading,
    stockConflict,
    currentStep,
    maxReachedStep,
    // Computed totals
    totalHtEstimate,
    totalTvaEstimate,
    // Auth step
    authUser,
    authMode,
    setAuthMode,
    guestEmail,
    setGuestEmail,
    signInEmail,
    setSignInEmail,
    signInPassword,
    setSignInPassword,
    signUpFullName,
    setSignUpFullName,
    signUpEmail,
    setSignUpEmail,
    signUpPassword,
    setSignUpPassword,
    signUpPasswordConfirm,
    setSignUpPasswordConfirm,
    isAuthSubmitting,
    authErrorKey,
    authSuccessKey,
    handleContinueAsGuest,
    handleSignInAndContinue,
    handleSignUpAndContinue,
    resetAuthMessages,
    // Address step
    savedAddresses,
    isAddressLoading,
    addressMode,
    setAddressMode,
    selectedAddressId,
    setSelectedAddressId,
    addressForm,
    setAddressForm,
    addressErrors,
    addressStepErrorKey,
    handleAddressStepContinue,
    effectiveAddressPreview,
    // Payment step
    savedPaymentMethods,
    isPaymentLoading,
    paymentMode,
    setPaymentMode,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
    paymentForm,
    setPaymentForm,
    paymentErrors,
    paymentStepErrorKey,
    handlePaymentStepContinue,
    paymentPreview,
    // Confirmation step
    checkoutErrorKey,
    isConfirmingOrder,
    handleConfirmPurchase,
    // Navigation
    goToStep,
    handleStepSelection,
    setCurrentStep,
  }
}
