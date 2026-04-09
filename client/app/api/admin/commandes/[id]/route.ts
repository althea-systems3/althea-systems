import { NextResponse } from "next/server"

import { normalizeString } from "@/lib/admin/common"
import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getCurrentUser } from "@/lib/auth/session"
import { logAdminActivity } from "@/lib/firebase/logActivity"
import { createAdminClient } from "@/lib/supabase/admin"
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types"

type RouteContext = {
  params: Promise<{ id: string }>
}

type OrderStatusPayload = {
  statut?: unknown
}

type UserRelation =
  | {
      nom_complet: string | null
      email: string | null
    }
  | {
      nom_complet: string | null
      email: string | null
    }[]
  | null

type ProductRelation =
  | {
      nom: string | null
      slug: string | null
    }
  | {
      nom: string | null
      slug: string | null
    }[]
  | null

type HistoryAdminRelation =
  | {
      nom_complet: string | null
      email: string | null
    }
  | {
      nom_complet: string | null
      email: string | null
    }[]
  | null

type OrderRow = {
  id_commande: string
  numero_commande: string
  date_commande: string
  montant_ht: number | string
  montant_tva: number | string
  montant_ttc: number | string
  statut: OrderStatus
  statut_paiement: PaymentStatus
  mode_paiement: string | null
  paiement_dernier_4: string | null
  id_utilisateur: string
  id_adresse: string
  utilisateur: UserRelation
}

type OrderLineRow = {
  id_ligne: string
  id_produit: string
  quantite: number
  prix_unitaire_ht: number | string
  prix_total_ttc: number | string
  produit: ProductRelation
}

type OrderAddressRow = {
  id_adresse: string
  prenom: string | null
  nom: string | null
  adresse_1: string | null
  adresse_2: string | null
  ville: string | null
  region: string | null
  code_postal: string | null
  pays: string | null
  telephone: string | null
}

type InvoiceRow = {
  id_facture: string
  numero_facture: string
  date_emission: string
  montant_ttc: number | string
  statut: string
  pdf_url: string | null
}

type StatusHistoryRow = {
  id_historique: string
  id_commande: string
  statut_precedent: string
  nouveau_statut: string
  date_changement: string
  id_admin_modification?: string | null
  admin?: HistoryAdminRelation
}

function parseStatus(value: unknown): OrderStatus | null {
  if (
    value === "en_attente" ||
    value === "en_cours" ||
    value === "terminee" ||
    value === "annulee"
  ) {
    return value
  }

  return null
}

function toSafeNumber(value: number | string): number {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return 0
  }

  return parsedValue
}

function normalizeUserRelation(
  relation: UserRelation,
): { nom_complet: string | null; email: string | null } | null {
  if (!relation) {
    return null
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null
  }

  return relation
}

function normalizeProductRelation(
  relation: ProductRelation,
): { nom: string | null; slug: string | null } | null {
  if (!relation) {
    return null
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null
  }

  return relation
}

function normalizeHistoryAdminRelation(
  relation: HistoryAdminRelation,
): { nom_complet: string | null; email: string | null } | null {
  if (!relation) {
    return null
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null
  }

  return relation
}

function maskPaymentLast4(last4: string | null): string | null {
  const safeLast4 = normalizeString(last4)

  if (!safeLast4) {
    return null
  }

  return `**** **** **** ${safeLast4}`
}

function isMissingAdminHistoryColumnError(error: unknown): boolean {
  const message =
    typeof (error as { message?: unknown })?.message === "string"
      ? (error as { message: string }).message
      : ""

  return message.toLowerCase().includes("id_admin_modification")
}

async function fetchOrderById(orderId: string): Promise<OrderRow | null> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("commande")
    .select(
      "id_commande, numero_commande, date_commande, montant_ht, montant_tva, montant_ttc, statut, statut_paiement, mode_paiement, paiement_dernier_4, id_utilisateur, id_adresse, utilisateur:id_utilisateur(nom_complet, email)",
    )
    .eq("id_commande", orderId)
    .single()

  if (error || !data) {
    return null
  }

  return data as OrderRow
}

async function fetchOrderLines(orderId: string): Promise<OrderLineRow[]> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("ligne_commande")
    .select(
      "id_ligne, id_produit, quantite, prix_unitaire_ht, prix_total_ttc, produit:id_produit(nom, slug)",
    )
    .eq("id_commande", orderId)

  if (error) {
    console.error("Erreur lecture lignes commande admin", { error })
    return []
  }

  return (data as OrderLineRow[] | null) ?? []
}

async function fetchOrderAddress(
  addressId: string,
): Promise<OrderAddressRow | null> {
  if (!addressId) {
    return null
  }

  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("adresse")
    .select(
      "id_adresse, prenom, nom, adresse_1, adresse_2, ville, region, code_postal, pays, telephone",
    )
    .eq("id_adresse", addressId)
    .single()

  if (error || !data) {
    return null
  }

  return data as OrderAddressRow
}

async function fetchOrderInvoice(orderId: string): Promise<InvoiceRow | null> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("facture")
    .select(
      "id_facture, numero_facture, date_emission, montant_ttc, statut, pdf_url",
    )
    .eq("id_commande", orderId)
    .order("date_emission", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as InvoiceRow
}

async function fetchStatusHistory(
  orderId: string,
): Promise<StatusHistoryRow[]> {
  const supabaseAdmin = createAdminClient()

  const withAdminResult = await supabaseAdmin
    .from("historique_statut")
    .select(
      "id_historique, id_commande, statut_precedent, nouveau_statut, date_changement, id_admin_modification, admin:id_admin_modification(nom_complet, email)",
    )
    .eq("id_commande", orderId)
    .order("date_changement", { ascending: false })
    .limit(200)

  if (!withAdminResult.error) {
    return (withAdminResult.data as StatusHistoryRow[] | null) ?? []
  }

  if (!isMissingAdminHistoryColumnError(withAdminResult.error)) {
    console.error("Erreur lecture historique statuts commande admin", {
      error: withAdminResult.error,
    })
    return []
  }

  const fallbackResult = await supabaseAdmin
    .from("historique_statut")
    .select(
      "id_historique, id_commande, statut_precedent, nouveau_statut, date_changement",
    )
    .eq("id_commande", orderId)
    .order("date_changement", { ascending: false })
    .limit(200)

  if (fallbackResult.error) {
    console.error("Erreur lecture historique statuts commande admin", {
      error: fallbackResult.error,
    })
    return []
  }

  return (fallbackResult.data as StatusHistoryRow[] | null) ?? []
}

async function insertOrderStatusHistory(payload: {
  orderId: string
  previousStatus: OrderStatus
  nextStatus: OrderStatus
  adminUserId: string | null
}) {
  const supabaseAdmin = createAdminClient()
  const insertPayload = {
    id_commande: payload.orderId,
    statut_precedent: payload.previousStatus,
    nouveau_statut: payload.nextStatus,
  }

  if (payload.adminUserId) {
    const withAdminInsert = await supabaseAdmin
      .from("historique_statut")
      .insert({
        ...insertPayload,
        id_admin_modification: payload.adminUserId,
      } as never)

    if (!withAdminInsert.error) {
      return
    }

    if (!isMissingAdminHistoryColumnError(withAdminInsert.error)) {
      throw withAdminInsert.error
    }
  }

  const fallbackInsert = await supabaseAdmin
    .from("historique_statut")
    .insert(insertPayload as never)

  if (fallbackInsert.error) {
    throw fallbackInsert.error
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params

    if (!normalizeString(id)) {
      return NextResponse.json(
        {
          error: "Identifiant commande invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const order = await fetchOrderById(id)

    if (!order) {
      return NextResponse.json(
        {
          error: "Commande introuvable.",
          code: "order_not_found",
        },
        { status: 404 },
      )
    }

    const [lines, address, invoice, statusHistory] = await Promise.all([
      fetchOrderLines(id),
      fetchOrderAddress(order.id_adresse),
      fetchOrderInvoice(id),
      fetchStatusHistory(id),
    ])

    const customer = normalizeUserRelation(order.utilisateur)
    const paymentDate =
      order.statut_paiement === "valide" ||
      order.statut_paiement === "rembourse"
        ? (invoice?.date_emission ?? null)
        : null

    return NextResponse.json({
      order: {
        id_commande: order.id_commande,
        numero_commande: order.numero_commande,
        date_commande: order.date_commande,
        montant_ht: toSafeNumber(order.montant_ht),
        montant_tva: toSafeNumber(order.montant_tva),
        montant_ttc: toSafeNumber(order.montant_ttc),
        statut: order.statut,
        statut_paiement: order.statut_paiement,
        mode_paiement: order.mode_paiement,
        paiement_dernier_4_masque: maskPaymentLast4(order.paiement_dernier_4),
        date_paiement: paymentDate,
        client: customer
          ? {
              nom_complet: customer.nom_complet,
              email: customer.email,
            }
          : null,
      },
      lines: lines.map((line) => {
        const product = normalizeProductRelation(line.produit)

        return {
          id_ligne: line.id_ligne,
          id_produit: line.id_produit,
          quantite: line.quantite,
          prix_unitaire_ht: toSafeNumber(line.prix_unitaire_ht),
          prix_total_ttc: toSafeNumber(line.prix_total_ttc),
          produit: product,
        }
      }),
      address,
      statusHistory: statusHistory.map((historyEntry) => {
        const admin = normalizeHistoryAdminRelation(historyEntry.admin ?? null)

        return {
          id_historique: historyEntry.id_historique,
          statut_precedent: historyEntry.statut_precedent,
          nouveau_statut: historyEntry.nouveau_statut,
          date_changement: historyEntry.date_changement,
          admin: admin
            ? {
                nom_complet: admin.nom_complet,
                email: admin.email,
              }
            : null,
        }
      }),
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
    })
  } catch (error) {
    console.error("Erreur inattendue detail commande admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params

    if (!normalizeString(id)) {
      return NextResponse.json(
        {
          error: "Identifiant commande invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as OrderStatusPayload | null

    const nextStatus = parseStatus(body?.statut)

    if (!nextStatus) {
      return NextResponse.json(
        {
          error: "Statut de commande invalide.",
          code: "status_invalid",
        },
        { status: 400 },
      )
    }

    const existingOrder = await fetchOrderById(id)

    if (!existingOrder) {
      return NextResponse.json(
        {
          error: "Commande introuvable.",
          code: "order_not_found",
        },
        { status: 404 },
      )
    }

    if (existingOrder.statut === nextStatus) {
      return NextResponse.json({
        order: {
          id_commande: existingOrder.id_commande,
          numero_commande: existingOrder.numero_commande,
          statut: existingOrder.statut,
          statut_paiement: existingOrder.statut_paiement,
        },
      })
    }

    const supabaseAdmin = createAdminClient()

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("commande")
      .update({ statut: nextStatus } as never)
      .eq("id_commande", id)
      .select(
        "id_commande, numero_commande, date_commande, montant_ttc, statut, statut_paiement",
      )
      .single()

    if (updateError || !updatedOrder) {
      console.error("Erreur mise a jour statut commande", { updateError })

      return NextResponse.json(
        {
          error: "Impossible de mettre a jour le statut.",
          code: "order_status_update_failed",
        },
        { status: 500 },
      )
    }

    const currentUser = await getCurrentUser()
    const adminUserId = normalizeString(currentUser?.user.id)

    try {
      await insertOrderStatusHistory({
        orderId: id,
        previousStatus: existingOrder.statut,
        nextStatus,
        adminUserId: adminUserId || null,
      })
    } catch (historyError) {
      console.error("Erreur insertion historique statut commande", {
        historyError,
      })
    }

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, "orders.status_update", {
        orderId: id,
        previousStatus: existingOrder.statut,
        nextStatus,
      })
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error("Erreur inattendue mise a jour commande admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
