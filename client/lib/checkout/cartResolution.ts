import { getCartSessionId } from "@/lib/auth/cartSession"
import { roundCurrency } from "@/lib/checkout/currency"
import type { createAdminClient } from "@/lib/supabase/admin"

export type ProductSnapshot = {
  nom: string
  slug: string
  prix_ht: number
  prix_ttc: number
  quantite_stock: number
  statut: string
}

export type CartLineRow = {
  id_ligne_panier: string
  id_produit: string
  quantite: number
  produit: ProductSnapshot | null
}

export type EnrichedLine = {
  productId: string
  productName: string
  quantity: number
  unitPriceHt: number
  unitPriceTtc: number
  subtotalHt: number
  subtotalTtc: number
}

export type StockIssue =
  | { productId: string; reason: "unavailable" }
  | {
      productId: string
      reason: "insufficient_stock"
      availableStock: number
    }

export type CartTotals = {
  totalItems: number
  totalHt: number
  totalTva: number
  totalTtc: number
}

export async function resolveCartId(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string | null,
): Promise<string | null> {
  if (userId) {
    const { data } = await supabaseAdmin
      .from("panier")
      .select("id_panier")
      .eq("id_utilisateur", userId)
      .limit(1)
      .single()

    return (data as { id_panier: string } | null)?.id_panier ?? null
  }

  const sessionId = await getCartSessionId()

  if (!sessionId) {
    return null
  }

  const { data } = await supabaseAdmin
    .from("panier")
    .select("id_panier")
    .eq("session_id", sessionId)
    .limit(1)
    .single()

  return (data as { id_panier: string } | null)?.id_panier ?? null
}

export async function fetchCartLines(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
): Promise<CartLineRow[]> {
  const { data, error } = await supabaseAdmin
    .from("ligne_panier")
    .select(
      "id_ligne_panier, id_produit, quantite, produit:id_produit(nom, slug, prix_ht, prix_ttc, quantite_stock, statut)",
    )
    .eq("id_panier", cartId)

  if (error || !data) {
    return []
  }

  return data as unknown as CartLineRow[]
}

export function findStockIssues(lines: CartLineRow[]): StockIssue[] {
  return lines
    .map((line): StockIssue | null => {
      if (!line.produit || line.produit.statut !== "publie") {
        return { productId: line.id_produit, reason: "unavailable" }
      }

      if (line.quantite > line.produit.quantite_stock) {
        return {
          productId: line.id_produit,
          reason: "insufficient_stock",
          availableStock: line.produit.quantite_stock,
        }
      }

      return null
    })
    .filter((issue): issue is StockIssue => issue !== null)
}

export function enrichCartLines(lines: CartLineRow[]): EnrichedLine[] {
  return lines.map((line) => {
    const product = line.produit!

    return {
      productId: line.id_produit,
      productName: product.nom,
      quantity: line.quantite,
      unitPriceHt: product.prix_ht,
      unitPriceTtc: product.prix_ttc,
      subtotalHt: roundCurrency(product.prix_ht * line.quantite),
      subtotalTtc: roundCurrency(product.prix_ttc * line.quantite),
    }
  })
}

export function computeTotals(lines: EnrichedLine[]): CartTotals {
  const totalHt = roundCurrency(
    lines.reduce((sum, line) => sum + line.subtotalHt, 0),
  )
  const totalTtc = roundCurrency(
    lines.reduce((sum, line) => sum + line.subtotalTtc, 0),
  )

  return {
    totalItems: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalHt,
    totalTva: roundCurrency(totalTtc - totalHt),
    totalTtc,
  }
}

export async function clearCart(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
): Promise<void> {
  await supabaseAdmin.from("ligne_panier").delete().eq("id_panier", cartId)
}
