import { normalizeString } from "@/lib/admin/common"
import { getStripeClient } from "@/lib/stripe/client"
import type { createAdminClient } from "@/lib/supabase/admin"

export type PaymentInput = {
  savedPaymentId?: string
  cardNumber?: string
  last4?: string
}

export type PaymentSnapshot = {
  mode: "carte"
  last4: string
  label: string
}

const LAST4_PATTERN = /^\d{4}$/

function extractLast4Digits(value: unknown): string | null {
  const normalizedValue = normalizeString(value)

  if (!normalizedValue) {
    return null
  }

  const digits = normalizedValue.replace(/\D/g, "")
  const last4 = digits.slice(-4)

  return LAST4_PATTERN.test(last4) ? last4 : null
}

async function fetchSavedPaymentLast4(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  savedPaymentId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("methode_paiement")
    .select("derniers_4_chiffres")
    .eq("id_utilisateur", userId)
    .eq("id_paiement", savedPaymentId)
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  const last4 = normalizeString(
    (data as { derniers_4_chiffres?: string }).derniers_4_chiffres,
  )

  return LAST4_PATTERN.test(last4) ? last4 : null
}

export async function resolvePaymentSnapshotFromPayload(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  paymentInput: PaymentInput | undefined,
): Promise<PaymentSnapshot | null> {
  if (!paymentInput) {
    return null
  }

  const savedPaymentId = normalizeString(paymentInput.savedPaymentId)

  if (savedPaymentId) {
    const savedLast4 = await fetchSavedPaymentLast4(
      supabaseAdmin,
      userId,
      savedPaymentId,
    )

    if (savedLast4) {
      return {
        mode: "carte",
        last4: savedLast4,
        label: `Carte •••• ${savedLast4}`,
      }
    }
  }

  const directLast4 =
    extractLast4Digits(paymentInput.last4) ??
    extractLast4Digits(paymentInput.cardNumber)

  if (!directLast4) {
    return null
  }

  return {
    mode: "carte",
    last4: directLast4,
    label: `Carte •••• ${directLast4}`,
  }
}

export async function confirmStripePayment(
  paymentIntentId: string,
): Promise<{ isSuccessful: boolean; paymentSnapshot: PaymentSnapshot | null }> {
  try {
    const stripe = getStripeClient()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return { isSuccessful: false, paymentSnapshot: null }
    }

    let paymentSnapshot: PaymentSnapshot | null = null

    try {
      let paymentMethodId = ""

      if (typeof paymentIntent.payment_method === "string") {
        paymentMethodId = paymentIntent.payment_method
      } else if (
        paymentIntent.payment_method &&
        typeof paymentIntent.payment_method === "object" &&
        "id" in paymentIntent.payment_method
      ) {
        paymentMethodId = normalizeString(
          (paymentIntent.payment_method as { id?: string }).id,
        )
      }

      if (paymentMethodId) {
        const paymentMethod =
          await stripe.paymentMethods.retrieve(paymentMethodId)
        const card = (
          paymentMethod as { card?: { last4?: string; brand?: string } }
        ).card
        const stripeLast4 = normalizeString(card?.last4)
        const stripeBrand = normalizeString(card?.brand)

        if (LAST4_PATTERN.test(stripeLast4)) {
          const brandLabel = stripeBrand
            ? stripeBrand.charAt(0).toUpperCase() + stripeBrand.slice(1)
            : "Carte"

          paymentSnapshot = {
            mode: "carte",
            last4: stripeLast4,
            label: `${brandLabel} •••• ${stripeLast4}`,
          }
        }
      }
    } catch (error) {
      console.error("Erreur extraction snapshot paiement Stripe", { error })
    }

    return { isSuccessful: true, paymentSnapshot }
  } catch (error) {
    console.error("Erreur vérification Stripe PaymentIntent", { error })
    return { isSuccessful: false, paymentSnapshot: null }
  }
}
