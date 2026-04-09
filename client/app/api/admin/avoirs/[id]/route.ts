import { NextResponse } from "next/server"

import { normalizeString } from "@/lib/admin/common"
import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CreditNoteReason, InvoiceStatus } from "@/lib/supabase/types"

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
  date_emission: string
  montant_ttc: number
  statut: InvoiceStatus
  pdf_url: string | null
}

type OrderRow = {
  id_commande: string
  numero_commande: string
  id_utilisateur: string
  date_commande: string
  statut: string
  statut_paiement: string
}

type UserRow = {
  id_utilisateur: string
  nom_complet: string | null
  email: string | null
}

function toSafeNumber(value: number): number {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
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
    .select(
      "id_facture, numero_facture, id_commande, date_emission, montant_ttc, statut, pdf_url",
    )
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
    .select(
      "id_commande, numero_commande, id_utilisateur, date_commande, statut, statut_paiement",
    )
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

export async function GET(_request: Request, { params }: RouteContext) {
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
    const order = invoice ? await fetchOrderById(invoice.id_commande) : null
    const customer = order ? await fetchUserById(order.id_utilisateur) : null

    return NextResponse.json({
      creditNote: {
        id_avoir: creditNote.id_avoir,
        numero_avoir: creditNote.numero_avoir,
        date_emission: creditNote.date_emission,
        montant: toSafeNumber(creditNote.montant),
        motif: creditNote.motif,
        pdf_url: creditNote.pdf_url,
      },
      invoice: invoice
        ? {
            id_facture: invoice.id_facture,
            numero_facture: invoice.numero_facture,
            date_emission: invoice.date_emission,
            montant_ttc: toSafeNumber(invoice.montant_ttc),
            statut: invoice.statut,
            pdf_url: invoice.pdf_url,
          }
        : null,
      order: order
        ? {
            id_commande: order.id_commande,
            numero_commande: order.numero_commande,
            date_commande: order.date_commande,
            statut: order.statut,
            statut_paiement: order.statut_paiement,
          }
        : null,
      client: customer
        ? {
            id_utilisateur: customer.id_utilisateur,
            nom_complet: customer.nom_complet,
            email: customer.email,
          }
        : null,
    })
  } catch (error) {
    console.error("Erreur detail avoir admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
