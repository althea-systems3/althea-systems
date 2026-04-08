import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCartSessionId } from "@/lib/auth/cartSession"

type ProductSnapshot = {
  nom: string
  slug: string
  prix_ht: number
  prix_ttc: number
  quantite_stock: number
  statut: string
  tva: string
}

type CartLineRow = {
  id_ligne_panier: string
  id_produit: string
  quantite: number
  produit: ProductSnapshot | null
}

type CheckoutAddressSummary = {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  region: string
  postalCode: string
  country: string
  phone: string
}

type CheckoutPaymentSummary = {
  mode: "saved" | "new"
  cardHolder: string
  last4: string
  expiry: string
}

type ConfirmCheckoutBody = {
  guestEmail?: string
  address?: {
    savedAddressId?: string
    firstName?: string
    lastName?: string
    address1?: string
    address2?: string
    city?: string
    region?: string
    postalCode?: string
    country?: string
    phone?: string
  }
  payment?: {
    savedPaymentId?: string
    cardHolder?: string
    cardNumber?: string
    expiry?: string
    cvc?: string
  }
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function getLast4Digits(cardNumber: string): string {
  const digitsOnly = cardNumber.replace(/\D/g, "")

  if (digitsOnly.length < 4) {
    return ""
  }

  return digitsOnly.slice(-4)
}

function buildOrderNumber(): string {
  const date = new Date()
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase()

  return `ALT-${year}${month}-${randomPart}`
}

async function resolveCartId(
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

async function fetchCartLines(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
): Promise<CartLineRow[]> {
  const { data, error } = await supabaseAdmin
    .from("ligne_panier")
    .select(
      "id_ligne_panier, id_produit, quantite, produit:id_produit(nom, slug, prix_ht, prix_ttc, quantite_stock, statut, tva)",
    )
    .eq("id_panier", cartId)

  if (error || !data) {
    return []
  }

  return data as unknown as CartLineRow[]
}

async function resolveSavedAddress(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  addressId: string,
): Promise<{ addressId: string; summary: CheckoutAddressSummary } | null> {
  const { data, error } = await supabaseAdmin
    .from("adresse")
    .select(
      "id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone",
    )
    .eq("id_utilisateur", userId)
    .eq("id_adresse", addressId)
    .single()

  if (error || !data) {
    return null
  }

  const row = data as {
    id_adresse: string
    prenom: string
    nom: string
    adresse_1: string
    adresse_2: string | null
    ville: string
    code_postal: string
    pays: string
    telephone: string | null
  }

  return {
    addressId: row.id_adresse,
    summary: {
      firstName: row.prenom,
      lastName: row.nom,
      address1: row.adresse_1,
      address2: row.adresse_2 ?? "",
      city: row.ville,
      region: "",
      postalCode: row.code_postal,
      country: row.pays,
      phone: row.telephone ?? "",
    },
  }
}

async function resolveAddress(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string | null,
  addressInput: ConfirmCheckoutBody["address"],
): Promise<
  | {
      addressId: string | null
      summary: CheckoutAddressSummary
    }
  | { error: string }
> {
  if (!addressInput) {
    return { error: "Adresse manquante" }
  }

  const savedAddressId = normalizeString(addressInput.savedAddressId)

  if (userId && savedAddressId) {
    const savedAddress = await resolveSavedAddress(
      supabaseAdmin,
      userId,
      savedAddressId,
    )

    if (!savedAddress) {
      return { error: "Adresse enregistrée introuvable" }
    }

    return savedAddress
  }

  const summary: CheckoutAddressSummary = {
    firstName: normalizeString(addressInput.firstName),
    lastName: normalizeString(addressInput.lastName),
    address1: normalizeString(addressInput.address1),
    address2: normalizeString(addressInput.address2),
    city: normalizeString(addressInput.city),
    region: normalizeString(addressInput.region),
    postalCode: normalizeString(addressInput.postalCode),
    country: normalizeString(addressInput.country),
    phone: normalizeString(addressInput.phone),
  }

  if (
    !summary.firstName ||
    !summary.lastName ||
    !summary.address1 ||
    !summary.city ||
    !summary.region ||
    !summary.postalCode ||
    !summary.country ||
    !summary.phone
  ) {
    return { error: "Adresse incomplète" }
  }

  if (!userId) {
    return {
      addressId: null,
      summary,
    }
  }

  const { data, error } = await supabaseAdmin
    .from("adresse")
    .insert({
      id_utilisateur: userId,
      prenom: summary.firstName,
      nom: summary.lastName,
      adresse_1: summary.address1,
      adresse_2: summary.address2 || null,
      ville: summary.city,
      code_postal: summary.postalCode,
      pays: summary.country,
      telephone: summary.phone,
    } as never)
    .select("id_adresse")
    .single()

  if (error || !data) {
    return { error: "Impossible de sauvegarder la nouvelle adresse" }
  }

  const insertedAddress = data as { id_adresse: string }

  return {
    addressId: insertedAddress.id_adresse,
    summary,
  }
}

async function resolveSavedPayment(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  paymentId: string,
): Promise<CheckoutPaymentSummary | null> {
  const { data, error } = await supabaseAdmin
    .from("methode_paiement")
    .select("id_paiement, nom_carte, derniers_4_chiffres, date_expiration")
    .eq("id_utilisateur", userId)
    .eq("id_paiement", paymentId)
    .single()

  if (error || !data) {
    return null
  }

  const payment = data as {
    id_paiement: string
    nom_carte: string
    derniers_4_chiffres: string
    date_expiration: string
  }

  return {
    mode: "saved",
    cardHolder: payment.nom_carte,
    last4: payment.derniers_4_chiffres,
    expiry: payment.date_expiration,
  }
}

async function resolvePayment(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string | null,
  paymentInput: ConfirmCheckoutBody["payment"],
): Promise<CheckoutPaymentSummary | { error: string }> {
  if (!paymentInput) {
    return { error: "Paiement manquant" }
  }

  const savedPaymentId = normalizeString(paymentInput.savedPaymentId)

  if (userId && savedPaymentId) {
    const savedPayment = await resolveSavedPayment(
      supabaseAdmin,
      userId,
      savedPaymentId,
    )

    if (!savedPayment) {
      return { error: "Moyen de paiement enregistré introuvable" }
    }

    return savedPayment
  }

  const cardHolder = normalizeString(paymentInput.cardHolder)
  const cardNumber = normalizeString(paymentInput.cardNumber)
  const expiry = normalizeString(paymentInput.expiry)
  const cvc = normalizeString(paymentInput.cvc)

  if (!cardHolder || !cardNumber || !expiry || !cvc) {
    return { error: "Moyen de paiement incomplet" }
  }

  const last4 = getLast4Digits(cardNumber)

  if (!last4) {
    return { error: "Numéro de carte invalide" }
  }

  return {
    mode: "new",
    cardHolder,
    last4,
    expiry,
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const supabaseAdmin = createAdminClient()

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    const body = (await request
      .json()
      .catch(() => null)) as ConfirmCheckoutBody | null

    const guestEmail = normalizeString(body?.guestEmail)

    if (!user && !guestEmail) {
      return NextResponse.json(
        { error: "Email invité requis pour finaliser la commande" },
        { status: 400 },
      )
    }

    const cartId = await resolveCartId(supabaseAdmin, user?.id ?? null)

    if (!cartId) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 })
    }

    const rawLines = await fetchCartLines(supabaseAdmin, cartId)

    if (rawLines.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 })
    }

    const stockIssues = rawLines
      .map((line) => {
        if (!line.produit || line.produit.statut !== "publie") {
          return {
            lineId: line.id_ligne_panier,
            productId: line.id_produit,
            reason: "unavailable",
          }
        }

        if (line.produit.quantite_stock <= 0) {
          return {
            lineId: line.id_ligne_panier,
            productId: line.id_produit,
            reason: "out_of_stock",
            availableStock: 0,
          }
        }

        if (line.quantite > line.produit.quantite_stock) {
          return {
            lineId: line.id_ligne_panier,
            productId: line.id_produit,
            reason: "insufficient_stock",
            availableStock: line.produit.quantite_stock,
          }
        }

        return null
      })
      .filter((issue) => issue !== null)

    if (stockIssues.length > 0) {
      return NextResponse.json(
        {
          error: "Conflit de stock",
          code: "stock_conflict",
          issues: stockIssues,
        },
        { status: 409 },
      )
    }

    const addressResult = await resolveAddress(
      supabaseAdmin,
      user?.id ?? null,
      body?.address,
    )

    if ("error" in addressResult) {
      return NextResponse.json({ error: addressResult.error }, { status: 400 })
    }

    const paymentResult = await resolvePayment(
      supabaseAdmin,
      user?.id ?? null,
      body?.payment,
    )

    if ("error" in paymentResult) {
      return NextResponse.json({ error: paymentResult.error }, { status: 400 })
    }

    const orderNumber = buildOrderNumber()

    const enrichedLines = rawLines.map((line) => {
      const product = line.produit!
      const subtotalTtc = roundCurrency(product.prix_ttc * line.quantite)
      const subtotalHt = roundCurrency(product.prix_ht * line.quantite)

      return {
        lineId: line.id_ligne_panier,
        productId: line.id_produit,
        name: product.nom,
        slug: product.slug,
        quantity: line.quantite,
        unitPriceTtc: product.prix_ttc,
        unitPriceHt: product.prix_ht,
        subtotalTtc,
        subtotalHt,
      }
    })

    const totalItems = enrichedLines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    )
    const totalHt = roundCurrency(
      enrichedLines.reduce((sum, line) => sum + line.subtotalHt, 0),
    )
    const totalTtc = roundCurrency(
      enrichedLines.reduce((sum, line) => sum + line.subtotalTtc, 0),
    )
    const totalTva = roundCurrency(totalTtc - totalHt)

    let persistedOrderId: string | null = null

    if (user?.id && addressResult.addressId) {
      const { data: insertedOrder, error: orderInsertError } =
        await supabaseAdmin
          .from("commande")
          .insert({
            numero_commande: orderNumber,
            id_utilisateur: user.id,
            id_adresse: addressResult.addressId,
            montant_ht: totalHt,
            montant_tva: totalTva,
            montant_ttc: totalTtc,
            statut: "en_attente",
            statut_paiement: "en_attente",
          } as never)
          .select("id_commande")
          .single()

      if (!orderInsertError && insertedOrder) {
        const inserted = insertedOrder as { id_commande: string }
        persistedOrderId = inserted.id_commande

        const orderLines = enrichedLines.map((line) => ({
          id_commande: persistedOrderId,
          id_produit: line.productId,
          quantite: line.quantity,
          prix_unitaire_ht: line.unitPriceHt,
          prix_total_ttc: line.subtotalTtc,
        }))

        const { error: orderLinesError } = await supabaseAdmin
          .from("ligne_commande")
          .insert(orderLines as never)

        if (orderLinesError) {
          console.error("Erreur insertion lignes commande", { orderLinesError })
        }

        const { error: historyError } = await supabaseAdmin
          .from("historique_statut")
          .insert({
            id_commande: persistedOrderId,
            statut_precedent: "en_attente",
            nouveau_statut: "en_attente",
          } as never)

        if (historyError) {
          console.error("Erreur insertion historique commande", {
            historyError,
          })
        }
      } else {
        console.error("Erreur insertion commande", { orderInsertError })
      }
    }

    const { error: clearCartError } = await supabaseAdmin
      .from("ligne_panier")
      .delete()
      .eq("id_panier", cartId)

    if (clearCartError) {
      console.error("Erreur vidage panier après checkout", { clearCartError })
      return NextResponse.json(
        { error: "Impossible de finaliser le paiement" },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        orderId: persistedOrderId ?? `tmp-${crypto.randomUUID()}`,
        orderNumber,
        status: "confirmed",
        summary: {
          totalItems,
          totalHt,
          totalTva,
          totalTtc,
          contactEmail: user?.email ?? guestEmail,
          lines: enrichedLines,
          address: addressResult.summary,
          payment: paymentResult,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur inattendue confirmation checkout", { error })
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
