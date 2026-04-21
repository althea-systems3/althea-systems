import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_CONVERSATIONS } from "@/lib/contact/constants"

type DashboardKpis = {
  ordersCount: number
  revenueTotal: number
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  ordersToday: number
  outOfStockProducts: number
  usersCount: number
  pendingContactMessages: number
  pendingChatbotConversations: number
}

type CategorySalesPoint = {
  categoryName: string
  revenueTotal: number
  ordersCount: number
}

type DailySalesPoint = {
  dayLabel: string
  revenueTotal: number
  ordersCount: number
}

type AverageBasketByCategoryPoint = {
  categoryName: string
  averageBasket: number
  ordersCount: number
}

type DashboardCharts = {
  categorySales: CategorySalesPoint[]
  dailySales: DailySalesPoint[]
  averageBasketByCategory: AverageBasketByCategoryPoint[]
}

const RECENT_DAYS_WINDOW = 7

function startOfTodayUtc(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function daysAgoUtc(daysAgo: number): Date {
  const reference = startOfTodayUtc()
  reference.setUTCDate(reference.getUTCDate() - daysAgo)
  return reference
}

function formatDayLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${day}/${month}`
}

function buildDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toSafeNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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

type OrderRow = {
  id_commande: string
  montant_ttc: number | string
  date_commande: string
}

type OrderLineRow = {
  id_commande: string
  prix_total_ttc: number | string
  produit:
    | {
        produit_categorie:
          | {
              categorie: { nom: string | null } | { nom: string | null }[] | null
            }
          | {
              categorie: { nom: string | null } | { nom: string | null }[] | null
            }[]
          | null
      }
    | {
        produit_categorie:
          | {
              categorie: { nom: string | null } | { nom: string | null }[] | null
            }
          | {
              categorie: { nom: string | null } | { nom: string | null }[] | null
            }[]
          | null
      }[]
    | null
}

function extractCategoryNames(line: OrderLineRow): string[] {
  if (!line.produit) return []

  const produitArray = Array.isArray(line.produit) ? line.produit : [line.produit]
  const names = new Set<string>()

  produitArray.forEach((produit) => {
    if (!produit?.produit_categorie) return
    const linkArray = Array.isArray(produit.produit_categorie)
      ? produit.produit_categorie
      : [produit.produit_categorie]

    linkArray.forEach((link) => {
      if (!link?.categorie) return
      const categorieArray = Array.isArray(link.categorie)
        ? link.categorie
        : [link.categorie]

      categorieArray.forEach((cat) => {
        if (cat?.nom) names.add(cat.nom)
      })
    })
  })

  return Array.from(names)
}

async function fetchRecentOrders(): Promise<OrderRow[]> {
  const supabaseAdmin = createAdminClient()
  const since = daysAgoUtc(RECENT_DAYS_WINDOW - 1).toISOString()

  const { data, error } = await supabaseAdmin
    .from("commande")
    .select("id_commande, montant_ttc, date_commande")
    .gte("date_commande", since)

  if (error) {
    console.error("Erreur lecture commandes recentes dashboard", { error })
    return []
  }

  return (data as OrderRow[] | null) ?? []
}

async function fetchOrderLinesForCharts(
  orderIds: string[],
): Promise<OrderLineRow[]> {
  if (orderIds.length === 0) return []

  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("ligne_commande")
    .select(
      "id_commande, prix_total_ttc, produit:id_produit(produit_categorie:produit_categorie(categorie:id_categorie(nom)))",
    )
    .in("id_commande", orderIds)

  if (error) {
    console.error("Erreur lecture lignes commande dashboard", { error })
    return []
  }

  return (data as OrderLineRow[] | null) ?? []
}

function buildDailySales(orders: OrderRow[]): DailySalesPoint[] {
  const dailyMap = new Map<string, { revenue: number; count: number }>()

  for (let i = RECENT_DAYS_WINDOW - 1; i >= 0; i -= 1) {
    const day = daysAgoUtc(i)
    dailyMap.set(buildDayKey(day), { revenue: 0, count: 0 })
  }

  orders.forEach((order) => {
    const dayKey = order.date_commande.slice(0, 10)
    const entry = dailyMap.get(dayKey)
    if (!entry) return
    entry.revenue += toSafeNumber(order.montant_ttc)
    entry.count += 1
  })

  return Array.from(dailyMap.entries()).map(([dayKey, entry]) => ({
    dayLabel: formatDayLabel(new Date(`${dayKey}T00:00:00.000Z`)),
    revenueTotal: Math.round(entry.revenue * 100) / 100,
    ordersCount: entry.count,
  }))
}

function buildCategoryStats(
  orders: OrderRow[],
  lines: OrderLineRow[],
): {
  categorySales: CategorySalesPoint[]
  averageBasketByCategory: AverageBasketByCategoryPoint[]
} {
  const orderRevenueMap = new Map<string, number>()
  orders.forEach((order) => {
    orderRevenueMap.set(order.id_commande, toSafeNumber(order.montant_ttc))
  })

  const categoryRevenue = new Map<string, number>()
  const categoryOrderIds = new Map<string, Set<string>>()

  lines.forEach((line) => {
    const categories = extractCategoryNames(line)
    if (categories.length === 0) return

    const lineAmount = toSafeNumber(line.prix_total_ttc)

    categories.forEach((categoryName) => {
      categoryRevenue.set(
        categoryName,
        (categoryRevenue.get(categoryName) ?? 0) + lineAmount,
      )

      const orderIds = categoryOrderIds.get(categoryName) ?? new Set<string>()
      orderIds.add(line.id_commande)
      categoryOrderIds.set(categoryName, orderIds)
    })
  })

  const categorySales: CategorySalesPoint[] = Array.from(
    categoryRevenue.entries(),
  )
    .map(([categoryName, revenue]) => ({
      categoryName,
      revenueTotal: Math.round(revenue * 100) / 100,
      ordersCount: categoryOrderIds.get(categoryName)?.size ?? 0,
    }))
    .sort((a, b) => b.revenueTotal - a.revenueTotal)

  const averageBasketByCategory: AverageBasketByCategoryPoint[] = Array.from(
    categoryOrderIds.entries(),
  )
    .map(([categoryName, orderIds]) => {
      const basketTotal = Array.from(orderIds).reduce(
        (sum, orderId) => sum + (orderRevenueMap.get(orderId) ?? 0),
        0,
      )
      const ordersCount = orderIds.size
      return {
        categoryName,
        averageBasket:
          ordersCount > 0
            ? Math.round((basketTotal / ordersCount) * 100) / 100
            : 0,
        ordersCount,
      }
    })
    .sort((a, b) => b.averageBasket - a.averageBasket)

  return { categorySales, averageBasketByCategory }
}

function computeKpiBuckets(
  orders: OrderRow[],
  totalRevenue: number,
  totalOrders: number,
) {
  const todayStart = startOfTodayUtc().toISOString()
  const weekStart = daysAgoUtc(6).toISOString()
  const monthStart = daysAgoUtc(29).toISOString()

  let revenueToday = 0
  let revenueWeek = 0
  let revenueMonth = 0
  let ordersToday = 0

  orders.forEach((order) => {
    const amount = toSafeNumber(order.montant_ttc)
    const date = order.date_commande

    if (date >= monthStart) revenueMonth += amount
    if (date >= weekStart) revenueWeek += amount
    if (date >= todayStart) {
      revenueToday += amount
      ordersToday += 1
    }
  })

  return {
    revenueToday: Math.round(revenueToday * 100) / 100,
    revenueWeek: Math.round(revenueWeek * 100) / 100,
    revenueMonth: Math.round(revenueMonth * 100) / 100,
    revenueTotal: Math.round(totalRevenue * 100) / 100,
    ordersToday,
    ordersCount: totalOrders,
  }
}

async function fetchOutOfStockCount(): Promise<number> {
  const supabaseAdmin = createAdminClient()
  const { count, error } = await supabaseAdmin
    .from("produit")
    .select("id_produit", { count: "exact", head: true })
    .eq("quantite_stock", 0)
    .eq("statut", "publie")

  if (error) {
    console.error("Erreur lecture stock dashboard", { error })
    return 0
  }

  return count ?? 0
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
      allOrdersResult,
      usersCountResult,
      pendingContactResult,
      pendingChatbotCount,
      recentOrders,
      outOfStockCount,
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
      fetchRecentOrders(),
      fetchOutOfStockCount(),
    ])

    const totalRevenue = (
      (allOrdersResult.data as Array<{ montant_ttc: number | string }> | null) ??
      []
    ).reduce((sum, row) => sum + toSafeNumber(row.montant_ttc), 0)

    const orderIds = recentOrders.map((order) => order.id_commande)
    const lines = await fetchOrderLinesForCharts(orderIds)

    const buckets = computeKpiBuckets(
      recentOrders,
      totalRevenue,
      ordersCountResult.count ?? 0,
    )

    const dailySales = buildDailySales(recentOrders)
    const { categorySales, averageBasketByCategory } = buildCategoryStats(
      recentOrders,
      lines,
    )

    const kpis: DashboardKpis = {
      ordersCount: buckets.ordersCount,
      revenueTotal: buckets.revenueTotal,
      revenueToday: buckets.revenueToday,
      revenueWeek: buckets.revenueWeek,
      revenueMonth: buckets.revenueMonth,
      ordersToday: buckets.ordersToday,
      outOfStockProducts: outOfStockCount,
      usersCount: usersCountResult.count ?? 0,
      pendingContactMessages: pendingContactResult.count ?? 0,
      pendingChatbotConversations: pendingChatbotCount,
    }

    const charts: DashboardCharts = {
      categorySales,
      dailySales,
      averageBasketByCategory,
    }

    return NextResponse.json({ kpis, charts })
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
