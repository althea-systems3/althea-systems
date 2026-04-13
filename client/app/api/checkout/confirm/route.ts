import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCartSessionId, clearCartSession } from "@/lib/auth/cartSession"
import { getStripeClient } from "@/lib/stripe/client"
import { roundCurrency } from "@/lib/checkout/currency"
import {
  buildOrderNumber,
  buildInvoiceNumber,
} from "@/lib/checkout/numberGenerator"
import {
  ORDER_STATUS_PENDING,
  ORDER_STATUS_IN_PROGRESS,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_VALID,
  PAYMENT_STATUS_FAILED,
  INVOICE_STATUS_PAID,
  INVOICES_STORAGE_PATH,
  GUEST_USER_DEFAULT_STATUS,
  GUEST_USER_DEFAULT_NAME,
} from "@/lib/checkout/constants"
import { generateInvoicePdf } from "@/lib/checkout/pdf"
import type { InvoicePdfData } from "@/lib/checkout/pdf"
import { sendOrderConfirmationEmail } from "@/lib/checkout/email"
import { logCheckoutActivity } from "@/lib/checkout/logCheckoutActivity"

// --- Types ---

type ProductSnapshot = {
  nom: string
  slug: string
  prix_ht: number
  prix_ttc: number
  quantite_stock: number
  statut: string
}

type CartLineRow = {
  id_ligne_panier: string
  id_produit: string
  quantite: number
  produit: ProductSnapshot | null
}

type EnrichedLine = {
  productId: string
  productName: string
  quantity: number
  unitPriceHt: number
  unitPriceTtc: number
  subtotalHt: number
  subtotalTtc: number
}

type AddressInput = {
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

type PaymentInput = {
  savedPaymentId?: string
  cardNumber?: string
  last4?: string
}

type PaymentSnapshot = {
  mode: "carte"
  last4: string
  label: string
}

type ConfirmCheckoutBody = {
  paymentIntentId: string
  guestEmail?: string
  address?: AddressInput
  payment?: PaymentInput
}

const LAST4_PATTERN = /^\d{4}$/

// --- Helpers ---

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function extractLast4Digits(value: unknown): string | null {
  const normalizedValue = normalizeString(value)

  if (!normalizedValue) {
    return null
  }

  const digits = normalizedValue.replace(/\D/g, "")
  const last4 = digits.slice(-4)

  if (!LAST4_PATTERN.test(last4)) {
    return null
  }

  return last4
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

async function resolvePaymentSnapshotFromPayload(
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
      return { mode: "carte", last4: savedLast4, label: `Carte •••• ${savedLast4}` }
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

// --- Panier ---

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
      "id_ligne_panier, id_produit, quantite, produit:id_produit(nom, slug, prix_ht, prix_ttc, quantite_stock, statut)",
    )
    .eq("id_panier", cartId)

  if (error || !data) {
    return []
  }

  return data as unknown as CartLineRow[]
}

// --- Stock ---

function findStockIssues(lines: CartLineRow[]) {
  return lines
    .map((line) => {
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
    .filter((issue) => issue !== null)
}

function enrichCartLines(lines: CartLineRow[]): EnrichedLine[] {
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

function computeTotals(lines: EnrichedLine[]) {
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

// --- Guest user ---

async function findOrCreateGuestUser(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  guestEmail: string,
): Promise<string | null> {
  const { data: existingUser } = await supabaseAdmin
    .from("utilisateur")
    .select("id_utilisateur")
    .eq("email", guestEmail)
    .limit(1)
    .single()

  if (existingUser) {
    return (existingUser as { id_utilisateur: string }).id_utilisateur
  }

  // NOTE: Créer un utilisateur Supabase Auth via admin API
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      email_confirm: true,
      user_metadata: { nom_complet: GUEST_USER_DEFAULT_NAME },
    })

  if (authError || !authData.user) {
    console.error("Erreur création user guest", { authError })
    return null
  }

  // NOTE: Le trigger handle_new_user crée l'entrée utilisateur
  // Mettre à jour le statut
  await supabaseAdmin
    .from("utilisateur")
    .update({
      statut: GUEST_USER_DEFAULT_STATUS,
      nom_complet: GUEST_USER_DEFAULT_NAME,
    } as never)
    .eq("id_utilisateur", authData.user.id)

  return authData.user.id
}

// --- Adresse ---

async function resolveAddress(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  addressInput: AddressInput | undefined,
): Promise<string | null> {
  if (!addressInput) {
    return null
  }

  const savedAddressId = normalizeString(addressInput.savedAddressId)

  if (savedAddressId) {
    const { data } = await supabaseAdmin
      .from("adresse")
      .select("id_adresse")
      .eq("id_utilisateur", userId)
      .eq("id_adresse", savedAddressId)
      .single()

    return (data as { id_adresse: string } | null)?.id_adresse ?? null
  }

  const firstName = normalizeString(addressInput.firstName)
  const lastName = normalizeString(addressInput.lastName)
  const address1 = normalizeString(addressInput.address1)
  const city = normalizeString(addressInput.city)
  const postalCode = normalizeString(addressInput.postalCode)
  const country = normalizeString(addressInput.country)
  const phone = normalizeString(addressInput.phone)

  if (
    !firstName ||
    !lastName ||
    !address1 ||
    !city ||
    !postalCode ||
    !country ||
    !phone
  ) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("adresse")
    .insert({
      id_utilisateur: userId,
      prenom: firstName,
      nom: lastName,
      adresse_1: address1,
      adresse_2: normalizeString(addressInput.address2) || null,
      ville: city,
      region: normalizeString(addressInput.region) || null,
      code_postal: postalCode,
      pays: country,
      telephone: phone,
    } as never)
    .select("id_adresse")
    .single()

  if (error || !data) {
    return null
  }

  return (data as { id_adresse: string }).id_adresse
}

// --- Stripe ---

async function confirmStripePayment(
  paymentIntentId: string,
): Promise<{ isSuccessful: boolean; paymentSnapshot: PaymentSnapshot | null }> {
  try {
    const stripe = getStripeClient()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return {
        isSuccessful: false,
        paymentSnapshot: null,
      }
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
        const card = (paymentMethod as { card?: { last4?: string; brand?: string } }).card
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

    return {
      isSuccessful: true,
      paymentSnapshot,
    }
  } catch (error) {
    console.error("Erreur vérification Stripe PaymentIntent", { error })
    return { isSuccessful: false, paymentSnapshot: null }
  }
}

// --- Commande ---

async function insertOrder(
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

async function insertOrderLines(
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

async function insertStatusHistory(
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

// --- Stock ---

async function decrementProductStock(
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

// --- Facture ---

async function createInvoiceAndUploadPdf(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderId: string,
  orderNumber: string,
  totalTtc: number,
  customerName: string,
  customerEmail: string,
  addressSummary: AddressInput,
  lines: EnrichedLine[],
  totalHt: number,
  totalTva: number,
): Promise<string | null> {
  const invoiceNumber = buildInvoiceNumber()

  const invoiceData: InvoicePdfData = {
    invoiceNumber,
    orderNumber,
    issueDate: new Date().toISOString(),
    customerName,
    customerEmail,
    addressLine1: normalizeString(addressSummary.address1),
    addressLine2: normalizeString(addressSummary.address2),
    city: normalizeString(addressSummary.city),
    postalCode: normalizeString(addressSummary.postalCode),
    country: normalizeString(addressSummary.country),
    lines: lines.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPriceHt: line.unitPriceHt,
      totalTtc: line.subtotalTtc,
    })),
    totalHt,
    totalTva,
    totalTtc,
  }

  let pdfUrl: string | null = null

  try {
    const pdfBuffer = await generateInvoicePdf(invoiceData)
    pdfUrl = await uploadPdfToStorage(invoiceNumber, pdfBuffer)
  } catch (error) {
    console.error("Erreur génération/upload PDF facture", { error })
  }

  const { error } = await supabaseAdmin.from("facture").insert({
    numero_facture: invoiceNumber,
    id_commande: orderId,
    montant_ttc: totalTtc,
    statut: INVOICE_STATUS_PAID,
    pdf_url: pdfUrl,
  } as never)

  if (error) {
    console.error("Erreur insertion facture", { error })
    return null
  }

  return pdfUrl
}

async function uploadPdfToStorage(
  documentNumber: string,
  pdfBuffer: Buffer,
): Promise<string> {
  // NOTE: Utilise Firebase Admin Storage via le bucket par défaut
  const admin = await import("firebase-admin")
  const bucket = admin.storage().bucket()
  const filePath = `${INVOICES_STORAGE_PATH}/${documentNumber}.pdf`
  const file = bucket.file(filePath)

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: { documentNumber },
  })

  await file.makePublic()

  return file.publicUrl()
}

// --- Vidage panier ---

async function clearCart(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
): Promise<void> {
  await supabaseAdmin.from("ligne_panier").delete().eq("id_panier", cartId)
}

// --- Idempotence ---

async function findExistingOrder(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  paymentIntentId: string,
): Promise<{ id_commande: string; numero_commande: string } | null> {
  // NOTE: Chercher via metadata Stripe si double soumission
  try {
    const stripe = getStripeClient()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const cartId = paymentIntent.metadata?.cartId

    if (!cartId) {
      return null
    }

    // NOTE: Vérifier si une commande existe déjà pour ce panier
    // via le fait que le panier est vide
    const { data } = await supabaseAdmin
      .from("ligne_panier")
      .select("id_ligne_panier")
      .eq("id_panier", cartId)
      .limit(1)

    if (!data || data.length === 0) {
      // NOTE: Panier déjà vide → commande probablement déjà créée
      // Chercher la commande la plus récente pour cet utilisateur
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
          return orderData as {
            id_commande: string
            numero_commande: string
          }
        }
      }
    }
  } catch {
    // NOTE: En cas d'erreur, on continue normalement
  }

  return null
}

// --- Handler principal ---

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

    const paymentIntentId = normalizeString(body?.paymentIntentId)

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "paymentIntentId requis" },
        { status: 400 },
      )
    }

    const guestEmail = normalizeString(body?.guestEmail)

    if (!user && !guestEmail) {
      return NextResponse.json(
        { error: "Email invité requis pour finaliser la commande" },
        { status: 400 },
      )
    }

    // NOTE: Protection double soumission
    const existingOrder = await findExistingOrder(
      supabaseAdmin,
      paymentIntentId,
    )

    if (existingOrder) {
      return NextResponse.json({
        orderId: existingOrder.id_commande,
        orderNumber: existingOrder.numero_commande,
        status: "already_confirmed",
      })
    }

    // NOTE: Vérifier le paiement Stripe
    const { isSuccessful, paymentSnapshot: stripePaymentSnapshot } =
      await confirmStripePayment(paymentIntentId)
    const paymentStatus = isSuccessful
      ? PAYMENT_STATUS_VALID
      : PAYMENT_STATUS_FAILED

    if (!isSuccessful) {
      await logCheckoutActivity("paiement_echoue", {
        paymentIntentId,
        userId: user?.id ?? guestEmail,
      })

      return NextResponse.json(
        { error: "Paiement échoué", code: "payment_failed" },
        { status: 402 },
      )
    }

    // NOTE: Résoudre l'utilisateur (connecté ou guest)
    let userId = user?.id ?? null
    let contactEmail = user?.email ?? guestEmail

    if (!userId && guestEmail) {
      userId = await findOrCreateGuestUser(supabaseAdmin, guestEmail)

      if (!userId) {
        return NextResponse.json(
          { error: "Impossible de créer le compte invité" },
          { status: 500 },
        )
      }

      contactEmail = guestEmail
    }

    const payloadPaymentSnapshot = await resolvePaymentSnapshotFromPayload(
      supabaseAdmin,
      userId!,
      body?.payment,
    )

    const paymentSnapshot = stripePaymentSnapshot ?? payloadPaymentSnapshot

    // NOTE: Panier et stock
    const cartId = await resolveCartId(supabaseAdmin, user?.id ?? null)

    if (!cartId) {
      return NextResponse.json({ error: "Panier introuvable" }, { status: 400 })
    }

    const rawLines = await fetchCartLines(supabaseAdmin, cartId)

    if (rawLines.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 })
    }

    const stockIssues = findStockIssues(rawLines)

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

    // NOTE: Calculs
    const enrichedLines = enrichCartLines(rawLines)
    const totals = computeTotals(enrichedLines)
    const orderNumber = buildOrderNumber()

    // NOTE: Résoudre l'adresse
    const addressId = await resolveAddress(
      supabaseAdmin,
      userId!,
      body?.address,
    )

    if (!addressId) {
      return NextResponse.json(
        { error: "Adresse manquante ou invalide" },
        { status: 400 },
      )
    }

    // NOTE: Créer la commande
    const orderId = await insertOrder(
      supabaseAdmin,
      orderNumber,
      userId!,
      addressId,
      totals.totalHt,
      totals.totalTva,
      totals.totalTtc,
      paymentStatus,
      paymentSnapshot,
    )

    if (!orderId) {
      return NextResponse.json(
        { error: "Impossible de créer la commande" },
        { status: 500 },
      )
    }

    // NOTE: Lignes commande + historique + décrémentation stock
    await insertOrderLines(supabaseAdmin, orderId, enrichedLines)
    await insertStatusHistory(
      supabaseAdmin,
      orderId,
      PAYMENT_STATUS_PENDING,
      ORDER_STATUS_IN_PROGRESS,
    )
    await decrementProductStock(supabaseAdmin, enrichedLines)

    // NOTE: Facture + PDF
    const customerName =
      normalizeString(body?.address?.firstName) +
      " " +
      normalizeString(body?.address?.lastName)

    const invoicePdfUrl = await createInvoiceAndUploadPdf(
      supabaseAdmin,
      orderId,
      orderNumber,
      totals.totalTtc,
      customerName.trim() || GUEST_USER_DEFAULT_NAME,
      contactEmail!,
      body?.address ?? {},
      enrichedLines,
      totals.totalHt,
      totals.totalTva,
    )

    // NOTE: Vider le panier
    await clearCart(supabaseAdmin, cartId)
    await clearCartSession()

    // NOTE: Email de confirmation (non bloquant)
    sendOrderConfirmationEmail({
      recipientEmail: contactEmail!,
      customerName: customerName.trim() || GUEST_USER_DEFAULT_NAME,
      orderNumber,
      totalTtc: totals.totalTtc,
      lines: enrichedLines.map((line) => ({
        productName: line.productName,
        quantity: line.quantity,
        subtotalTtc: line.subtotalTtc,
      })),
      invoicePdfUrl,
    }).catch((emailError) => {
      console.error("Erreur envoi email confirmation", { emailError })
    })

    // NOTE: Logging (non bloquant)
    logCheckoutActivity("commande_creee", {
      orderId,
      orderNumber,
      userId,
      totalTtc: totals.totalTtc,
      paymentIntentId,
    }).catch(() => {})

    return NextResponse.json(
      {
        orderId,
        orderNumber,
        status: "confirmed",
        summary: {
          totalItems: totals.totalItems,
          totalHt: totals.totalHt,
          totalTva: totals.totalTva,
          totalTtc: totals.totalTtc,
          contactEmail,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur inattendue confirmation checkout", { error })
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
