import { getStripeClient } from "@/lib/stripe/client"
import type { createAdminClient } from "@/lib/supabase/admin"

export type ExistingOrder = {
  id_commande: string
  numero_commande: string
}

export async function findExistingOrder(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  paymentIntentId: string,
): Promise<ExistingOrder | null> {
  try {
    const stripe = getStripeClient()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const cartId = paymentIntent.metadata?.cartId

    if (!cartId) {
      return null
    }

    const { data } = await supabaseAdmin
      .from("ligne_panier")
      .select("id_ligne_panier")
      .eq("id_panier", cartId)
      .limit(1)

    if (!data || data.length === 0) {
      const userId = paymentIntent.metadata?.userId

      if (userId && userId !== "guest") {
        const { data: orderData } = await supabaseAdmin
          .from("commande")
          .select("id_commande, numero_commande")
          .eq("id_utilisateur", userId)
          .order("date_commande", { ascending: false })
          .limit(1)
          .single()

        if (orderData) {
          return orderData as ExistingOrder
        }
      }
    }
  } catch (error) {
    console.error("Erreur recherche commande existante (idempotence)", {
      error,
    })
  }

  return null
}
