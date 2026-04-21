"use client"

import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  ClipboardList,
  Mail,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { adminFetch, parseApiResponse } from "@/features/admin/adminApi"
import { formatCurrency } from "@/features/admin/adminUtils"
import {
  AverageBasketBarChart,
  CategorySalesPieChart,
  DailySalesBarChart,
} from "@/features/admin/dashboard/DashboardCharts"

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

type DashboardPayload = {
  kpis: DashboardKpis
  charts: DashboardCharts
}

const EMPTY_KPIS: DashboardKpis = {
  ordersCount: 0,
  revenueTotal: 0,
  revenueToday: 0,
  revenueWeek: 0,
  revenueMonth: 0,
  ordersToday: 0,
  outOfStockProducts: 0,
  usersCount: 0,
  pendingContactMessages: 0,
  pendingChatbotConversations: 0,
}

const EMPTY_CHARTS: DashboardCharts = {
  categorySales: [],
  dailySales: [],
  averageBasketByCategory: [],
}

export function AdminDashboardSection() {
  const [kpis, setKpis] = useState<DashboardKpis>(EMPTY_KPIS)
  const [charts, setCharts] = useState<DashboardCharts>(EMPTY_CHARTS)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await adminFetch("/api/admin/dashboard", {
        cache: "no-store",
      })

      const payload = await parseApiResponse<DashboardPayload>(
        response,
        "Impossible de charger les KPI du dashboard.",
      )

      setKpis(payload.kpis)
      setCharts(payload.charts ?? EMPTY_CHARTS)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les KPI du dashboard.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const revenueCards = useMemo(
    () => [
      {
        key: "revenue-today",
        label: "CA du jour",
        value: formatCurrency(kpis.revenueToday),
        icon: TrendingUp,
      },
      {
        key: "revenue-week",
        label: "CA 7 derniers jours",
        value: formatCurrency(kpis.revenueWeek),
        icon: Calendar,
      },
      {
        key: "revenue-month",
        label: "CA 30 derniers jours",
        value: formatCurrency(kpis.revenueMonth),
        icon: Package,
      },
      {
        key: "orders-today",
        label: "Commandes du jour",
        value: String(kpis.ordersToday),
        icon: ShoppingCart,
      },
    ],
    [kpis],
  )

  const alertCards = useMemo(
    () => [
      {
        key: "out-of-stock",
        label: "Produits en rupture",
        value: String(kpis.outOfStockProducts),
        icon: AlertTriangle,
        href: "/admin/produits",
        isAlert: kpis.outOfStockProducts > 0,
      },
      {
        key: "contact",
        label: "Messages contact non traités",
        value: String(kpis.pendingContactMessages),
        icon: Mail,
        href: "/admin/contact",
        isAlert: kpis.pendingContactMessages > 0,
      },
      {
        key: "chatbot",
        label: "Escalades chatbot en cours",
        value: String(kpis.pendingChatbotConversations),
        icon: Bot,
        href: "/admin/chatbot",
        isAlert: kpis.pendingChatbotConversations > 0,
      },
    ],
    [kpis],
  )

  const globalCards = useMemo(
    () => [
      {
        key: "orders",
        label: "Commandes totales",
        value: String(kpis.ordersCount),
        icon: ClipboardList,
        href: "/admin/commandes",
      },
      {
        key: "revenue-total",
        label: "CA total",
        value: formatCurrency(kpis.revenueTotal),
        icon: Package,
        href: "/admin/commandes",
      },
      {
        key: "users",
        label: "Utilisateurs",
        value: String(kpis.usersCount),
        icon: Users,
        href: "/admin/utilisateurs",
      },
    ],
    [kpis],
  )

  return (
    <section className="space-y-6" aria-labelledby="admin-dashboard-title">
      <header className="space-y-1">
        <h1
          id="admin-dashboard-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Dashboard admin
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Vue globale des indicateurs critiques du backoffice.
        </p>
      </header>

      {errorMessage ? (
        <div
          className="flex items-start gap-2 rounded-xl border border-brand-error/20 bg-red-50 p-4 text-sm text-brand-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Actions rapides</CardTitle>
          <CardDescription>
            Accès direct aux opérations courantes du backoffice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/produits/nouveau"
              className="flex items-center gap-2 rounded-lg border border-brand-cta/30 bg-brand-cta/5 px-3 py-2 text-sm font-medium text-brand-cta transition-colors hover:bg-brand-cta/10"
            >
              <Plus className="size-4" aria-hidden="true" />
              Ajouter un produit
            </Link>
            <Link
              href="/admin/commandes"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
            >
              <ClipboardList className="size-4" aria-hidden="true" />
              Voir les commandes
            </Link>
            <Link
              href="/admin/contact"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
            >
              <Mail className="size-4" aria-hidden="true" />
              Voir les messages
            </Link>
            <Link
              href="/admin/categories"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
            >
              <Package className="size-4" aria-hidden="true" />
              Gérer les catégories
            </Link>
            <Link
              href="/admin/carousel"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
            >
              <TrendingUp className="size-4" aria-hidden="true" />
              Gérer le carrousel
            </Link>
            <Link
              href="/admin/contenu-editorial"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
            >
              <Calendar className="size-4" aria-hidden="true" />
              Modifier le texte fixe home
            </Link>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="kpis-revenue">
        <h2
          id="kpis-revenue"
          className="heading-font mb-3 text-lg text-brand-nav"
        >
          Chiffre d&apos;affaires
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {revenueCards.map(({ key, label, value, icon: ItemIcon }) => (
            <Card key={key}>
              <CardHeader className="space-y-0 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardDescription className="text-slate-600">
                    {label}
                  </CardDescription>
                  <ItemIcon
                    className="size-4 text-brand-nav"
                    aria-hidden="true"
                  />
                </div>
                <CardTitle className="text-2xl text-brand-nav">
                  {isLoading ? "..." : value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="kpis-alerts">
        <h2
          id="kpis-alerts"
          className="heading-font mb-3 text-lg text-brand-nav"
        >
          Alertes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {alertCards.map(
            ({ key, label, value, icon: ItemIcon, href, isAlert }) => (
              <Card
                key={key}
                className={isAlert ? "border-brand-error/40 bg-red-50/40" : ""}
              >
                <CardHeader className="space-y-0 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardDescription className="text-slate-600">
                      {label}
                    </CardDescription>
                    <ItemIcon
                      className={`size-4 ${isAlert ? "text-brand-error" : "text-brand-nav"}`}
                      aria-hidden="true"
                    />
                  </div>
                  <CardTitle
                    className={`text-2xl ${isAlert ? "text-brand-error" : "text-brand-nav"}`}
                  >
                    {isLoading ? "..." : value}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={href}
                    className="text-sm font-medium text-brand-cta hover:underline"
                  >
                    Voir le détail
                  </Link>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      </section>

      <section aria-labelledby="kpis-global">
        <h2
          id="kpis-global"
          className="heading-font mb-3 text-lg text-brand-nav"
        >
          Vue globale
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {globalCards.map(({ key, label, value, icon: ItemIcon, href }) => (
            <Card key={key}>
              <CardHeader className="space-y-0 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardDescription className="text-slate-600">
                    {label}
                  </CardDescription>
                  <ItemIcon
                    className="size-4 text-brand-nav"
                    aria-hidden="true"
                  />
                </div>
                <CardTitle className="text-2xl text-brand-nav">
                  {isLoading ? "..." : value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={href}
                  className="text-sm font-medium text-brand-cta hover:underline"
                >
                  Ouvrir le module
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="charts-title"
        className="grid gap-6 lg:grid-cols-2"
      >
        <h2 id="charts-title" className="sr-only">
          Graphiques
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Ventes par catégorie (7 derniers jours)
            </CardTitle>
            <CardDescription>
              Répartition du chiffre d&apos;affaires par catégorie de produits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-500">Chargement du graphique...</p>
            ) : (
              <CategorySalesPieChart
                data={charts.categorySales}
                title="Répartition CA par catégorie"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Ventes par jour (7 derniers jours)
            </CardTitle>
            <CardDescription>
              Évolution du chiffre d&apos;affaires journalier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-500">Chargement du graphique...</p>
            ) : (
              <DailySalesBarChart
                data={charts.dailySales}
                title="Évolution CA journalier"
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">
              Panier moyen par catégorie (7 derniers jours)
            </CardTitle>
            <CardDescription>
              Comparez le panier moyen des commandes contenant chaque catégorie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-500">Chargement du graphique...</p>
            ) : (
              <AverageBasketBarChart
                data={charts.averageBasketByCategory}
                title="Panier moyen par catégorie"
              />
            )}
          </CardContent>
        </Card>
      </section>
    </section>
  )
}
