import {
  ORDER_STATUS_IN_PROGRESS,
  ORDER_STATUS_PENDING,
  PAYMENT_STATUS_VALID,
} from "@/lib/checkout/constants"
import type { createAdminClient } from "@/lib/supabase/admin"

import type { EnrichedLine } from "./cartResolution"
import type { PaymentSnapshot } from "./paymentSnapshot"

export async function insertOrder(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderNumber: string,
  userId: string,
  addressId: string,
  totalHt: number,
  totalTva: number,
  totalTtc: number,
  paymentStatus: string,
  paymentSnapshot: PaymentSnapshot | null,
): Promise<string | null> {
  const orderStatus =
    paymentStatus === PAYMENT_STATUS_VALID
      ? ORDER_STATUS_IN_PROGRESS
      : ORDER_STATUS_PENDING

  const { data, error } = await supabaseAdmin
    .from("commande")
    .insert({
      numero_commande: orderNumber,
      id_utilisateur: userId,
      id_adresse: addressId,
      montant_ht: totalHt,
      montant_tva: totalTva,
      montant_ttc: totalTtc,
      statut: orderStatus,
      statut_paiement: paymentStatus,
      mode_paiement: paymentSnapshot?.mode ?? null,
      paiement_dernier_4: paymentSnapshot?.last4 ?? null,
      mode_paiement_label: paymentSnapshot?.label ?? null,
    } as never)
    .select("id_commande")
    .single()

  if (error || !data) {
    console.error("Erreur insertion commande", { error })
    return null
  }

  return (data as { id_commande: string }).id_commande
}

export async function insertOrderLines(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderId: string,
  lines: EnrichedLine[],
): Promise<void> {
  const orderLines = lines.map((line) => ({
    id_commande: orderId,
    id_produit: line.productId,
    quantite: line.quantity,
    prix_unitaire_ht: line.unitPriceHt,
    prix_total_ttc: line.subtotalTtc,
  }))

  const { error } = await supabaseAdmin
    .from("ligne_commande")
    .insert(orderLines as never)

  if (error) {
    console.error("Erreur insertion lignes commande", { error })
  }
}

export async function insertStatusHistory(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderId: string,
  previousStatus: string,
  newStatus: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from("historique_statut").insert({
    id_commande: orderId,
    statut_precedent: previousStatus,
    nouveau_statut: newStatus,
  } as never)

  if (error) {
    console.error("Erreur insertion historique statut", { error })
  }
}

export async function decrementProductStock(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  lines: EnrichedLine[],
): Promise<void> {
  for (const line of lines) {
    const { data: product } = await supabaseAdmin
      .from("produit")
      .select("quantite_stock")
      .eq("id_produit", line.productId)
      .single()

    if (!product) {
      continue
    }

    const currentStock = (product as { quantite_stock: number }).quantite_stock
    const newStock = Math.max(0, currentStock - line.quantity)

    await supabaseAdmin
      .from("produit")
      .update({ quantite_stock: newStock } as never)
      .eq("id_produit", line.productId)
  }
}
