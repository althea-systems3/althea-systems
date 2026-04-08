import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type OrderRow = {
  id_commande: string
  numero_commande: string
  date_commande: string
  montant_ttc: number
  statut: string
  statut_paiement: string
}

type InvoiceRow = {
  id_commande: string
  numero_facture: string
  statut: string
  pdf_url: string | null
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const supabaseAdmin = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Session expiree",
          code: "session_expired",
        },
        { status: 401 },
      )
    }

    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from("commande")
      .select(
        "id_commande, numero_commande, date_commande, montant_ttc, statut, statut_paiement",
      )
      .eq("id_utilisateur", user.id)
      .order("date_commande", { ascending: false })

    if (ordersError || !ordersData) {
      console.error("Erreur lecture commandes compte", {
        ordersError,
        userId: user.id,
      })

      return NextResponse.json(
        {
          error: "Impossible de charger les commandes",
          code: "orders_fetch_failed",
        },
        { status: 500 },
      )
    }

    const orders = ordersData as OrderRow[]
    const orderIds = orders.map((order) => order.id_commande)

    let invoiceByOrderId = new Map<string, InvoiceRow>()

    if (orderIds.length > 0) {
      const { data: invoicesData } = await supabaseAdmin
        .from("facture")
        .select("id_commande, numero_facture, statut, pdf_url")
        .in("id_commande", orderIds)

      const invoices = (invoicesData ?? []) as InvoiceRow[]
      invoiceByOrderId = new Map(
        invoices.map((invoice) => [invoice.id_commande, invoice]),
      )
    }

    return NextResponse.json({
      orders: orders.map((order) => {
        const invoice = invoiceByOrderId.get(order.id_commande)

        return {
          id: order.id_commande,
          orderNumber: order.numero_commande,
          createdAt: order.date_commande,
          totalTtc: order.montant_ttc,
          status: order.statut,
          paymentStatus: order.statut_paiement,
          invoice: invoice
            ? {
                invoiceNumber: invoice.numero_facture,
                status: invoice.statut,
                pdfUrl: invoice.pdf_url,
              }
            : null,
        }
      }),
    })
  } catch (error) {
    console.error("Erreur inattendue lecture commandes compte", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
