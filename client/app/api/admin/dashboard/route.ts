import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"

type DashboardKpis = {
  ordersCount: number
  revenueTotal: number
  usersCount: number
  pendingContactMessages: number
  pendingChatbotConversations: number
}

async function getPendingChatbotConversationsCount(): Promise<number> {
  try {
    const firestore = getFirestoreClient()
    const snapshot = await firestore
      .collection(FIRESTORE_CHATBOT_CONVERSATIONS)
      .limit(500)
      .get()

    return snapshot.docs.filter((doc) => {
      const handoverStatus =
        (doc.data()?.human_handover?.status as string | undefined) ?? null

      return handoverStatus === "pending" || handoverStatus === "in_progress"
    }).length
  } catch (error) {
    console.error("Erreur lecture KPI chatbot", { error })
    return 0
  }
}

export async function GET() {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const supabaseAdmin = createAdminClient()

    const [
      ordersCountResult,
      revenueRowsResult,
      usersCountResult,
      pendingContactResult,
      pendingChatbotCount,
    ] = await Promise.all([
      supabaseAdmin
        .from("commande")
        .select("id_commande", { count: "exact", head: true }),
      supabaseAdmin.from("commande").select("montant_ttc"),
      supabaseAdmin
        .from("utilisateur")
        .select("id_utilisateur", { count: "exact", head: true }),
      supabaseAdmin
        .from("message_contact")
        .select("id_message", { count: "exact", head: true })
        .eq("est_traite", false),
      getPendingChatbotConversationsCount(),
    ])

    const revenueRows =
      (revenueRowsResult.data as Array<{
        montant_ttc: number | string
      }> | null) ?? []

    const revenueTotal = revenueRows.reduce((runningTotal, row) => {
      const amount = Number(row.montant_ttc)
      return Number.isFinite(amount) ? runningTotal + amount : runningTotal
    }, 0)

    const kpis: DashboardKpis = {
      ordersCount: ordersCountResult.count ?? 0,
      revenueTotal: Math.round(revenueTotal * 100) / 100,
      usersCount: usersCountResult.count ?? 0,
      pendingContactMessages: pendingContactResult.count ?? 0,
      pendingChatbotConversations: pendingChatbotCount,
    }

    return NextResponse.json({ kpis })
  } catch (error) {
    console.error("Erreur chargement dashboard admin", { error })

    return NextResponse.json(
      {
        error: "Erreur lors du chargement du dashboard.",
        code: "admin_dashboard_failed",
      },
      { status: 500 },
    )
  }
}
