import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { normalizeString } from "@/lib/admin/common"
import { clearCartSession } from "@/lib/auth/cartSession"
import {
  GUEST_USER_DEFAULT_NAME,
  ORDER_STATUS_IN_PROGRESS,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_VALID,
} from "@/lib/checkout/constants"
import { sendOrderConfirmationEmail } from "@/lib/checkout/email"
import { logCheckoutActivity } from "@/lib/checkout/logCheckoutActivity"
import { buildOrderNumber } from "@/lib/checkout/numberGenerator"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@/lib/supabase/server"

import type { AddressInput } from "@/lib/checkout/addressResolver"
import { resolveAddress } from "@/lib/checkout/addressResolver"
import {
  clearCart,
  computeTotals,
  enrichCartLines,
  fetchCartLines,
  findStockIssues,
  resolveCartId,
} from "@/lib/checkout/cartResolution"
import { findOrCreateGuestUser } from "@/lib/checkout/guestAccount"
import { findExistingOrder } from "@/lib/checkout/idempotency"
import { createInvoiceAndUploadPdf } from "@/lib/checkout/invoiceGeneration"
import {
  decrementProductStock,
  insertOrder,
  insertOrderLines,
  insertStatusHistory,
} from "@/lib/checkout/orderPersistence"
import type { PaymentInput } from "@/lib/checkout/paymentSnapshot"
import {
  confirmStripePayment,
  resolvePaymentSnapshotFromPayload,
} from "@/lib/checkout/paymentSnapshot"

type ConfirmCheckoutBody = {
  paymentIntentId: string
  guestEmail?: string
  address?: AddressInput
  payment?: PaymentInput
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

    const enrichedLines = enrichCartLines(rawLines)
    const totals = computeTotals(enrichedLines)
    const orderNumber = buildOrderNumber()

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

    await insertOrderLines(supabaseAdmin, orderId, enrichedLines)
    await insertStatusHistory(
      supabaseAdmin,
      orderId,
      PAYMENT_STATUS_PENDING,
      ORDER_STATUS_IN_PROGRESS,
    )
    await decrementProductStock(supabaseAdmin, enrichedLines)

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

    await clearCart(supabaseAdmin, cartId)
    await clearCartSession()

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

    logCheckoutActivity("commande_creee", {
      orderId,
      orderNumber,
      userId,
      totalTtc: totals.totalTtc,
      paymentIntentId,
    }).catch((logError) => {
      console.error("Erreur log commande_creee", { logError })
    })

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
