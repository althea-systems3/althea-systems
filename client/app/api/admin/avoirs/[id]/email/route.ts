import { NextRequest, NextResponse } from "next/server"

import { normalizeString } from "@/lib/admin/common"
import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getCurrentUser } from "@/lib/auth/session"
import { sendCreditNoteResendEmail } from "@/lib/checkout/email"
import { logAdminActivity } from "@/lib/firebase/logActivity"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CreditNoteReason } from "@/lib/supabase/types"

type RouteContext = {
  params: Promise<{ id: string }>
}

type CreditNoteRow = {
  id_avoir: string
  numero_avoir: string
  id_facture: string
  date_emission: string
  montant: number
  motif: CreditNoteReason
  pdf_url: string | null
}

type InvoiceRow = {
  id_facture: string
  numero_facture: string
  id_commande: string
}

type OrderRow = {
  id_commande: string
  numero_commande: string
  id_utilisateur: string
}

type UserRow = {
  id_utilisateur: string
  nom_complet: string | null
  email: string | null
}

async function fetchCreditNoteById(
  creditNoteId: string,
): Promise<CreditNoteRow | null> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("avoir")
    .select(
      "id_avoir, numero_avoir, id_facture, date_emission, montant, motif, pdf_url",
    )
    .eq("id_avoir", creditNoteId)
    .single()

  if (error || !data) {
    return null
  }

  return data as CreditNoteRow
}

async function fetchInvoiceById(invoiceId: string): Promise<InvoiceRow | null> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("facture")
    .select("id_facture, numero_facture, id_commande")
    .eq("id_facture", invoiceId)
    .single()

  if (error || !data) {
    return null
  }

  return data as InvoiceRow
}

async function fetchOrderById(orderId: string): Promise<OrderRow | null> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("commande")
    .select("id_commande, numero_commande, id_utilisateur")
    .eq("id_commande", orderId)
    .single()

  if (error || !data) {
    return null
  }

  return data as OrderRow
}

async function fetchUserById(userId: string): Promise<UserRow | null> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("utilisateur")
    .select("id_utilisateur, nom_complet, email")
    .eq("id_utilisateur", userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as UserRow
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params
    const creditNoteId = normalizeString(id)

    if (!creditNoteId) {
      return NextResponse.json(
        {
          error: "Identifiant avoir invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const creditNote = await fetchCreditNoteById(creditNoteId)

    if (!creditNote) {
      return NextResponse.json(
        {
          error: "Avoir introuvable.",
          code: "credit_note_not_found",
        },
        { status: 404 },
      )
    }

    const invoice = await fetchInvoiceById(creditNote.id_facture)

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Facture liee introuvable.",
          code: "invoice_not_found",
        },
        { status: 404 },
      )
    }

    const order = await fetchOrderById(invoice.id_commande)

    if (!order) {
      return NextResponse.json(
        {
          error: "Commande associee introuvable.",
          code: "order_not_found",
        },
        { status: 404 },
      )
    }

    const user = await fetchUserById(order.id_utilisateur)

    if (!user || !normalizeString(user.email)) {
      return NextResponse.json(
        {
          error: "Client associe sans email valide.",
          code: "customer_email_missing",
        },
        { status: 400 },
      )
    }

    await sendCreditNoteResendEmail({
      recipientEmail: user.email as string,
      customerName: user.nom_complet || "Client",
      creditNoteNumber: creditNote.numero_avoir,
      invoiceNumber: invoice.numero_facture,
      issueDate: creditNote.date_emission,
      amount: Number(creditNote.montant) || 0,
      reason: creditNote.motif,
      creditNotePdfUrl: creditNote.pdf_url,
    })

    const currentUser = await getCurrentUser()

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, "credit_notes.send_email", {
        creditNoteId,
        creditNoteNumber: creditNote.numero_avoir,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur envoi avoir email admin", { error })

    return NextResponse.json(
      {
        error: "Impossible de renvoyer l'avoir par email.",
        code: "credit_note_send_email_failed",
      },
      { status: 500 },
    )
  }
}
