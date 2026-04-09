"use client"

import {
  AlertCircle,
  Bot,
  ClipboardList,
  Mail,
  Package,
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
import { parseApiResponse } from "@/features/admin/adminApi"
import { formatCurrency } from "@/features/admin/adminUtils"

type DashboardKpis = {
  ordersCount: number
  revenueTotal: number
  usersCount: number
  pendingContactMessages: number
  pendingChatbotConversations: number
}

type DashboardPayload = {
  kpis: DashboardKpis
}

const EMPTY_KPIS: DashboardKpis = {
  ordersCount: 0,
  revenueTotal: 0,
  usersCount: 0,
  pendingContactMessages: 0,
  pendingChatbotConversations: 0,
}

export function AdminDashboardSection() {
  const [kpis, setKpis] = useState<DashboardKpis>(EMPTY_KPIS)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/admin/dashboard", {
        cache: "no-store",
      })

      const payload = await parseApiResponse<DashboardPayload>(
        response,
        "Impossible de charger les KPI du dashboard.",
      )

      setKpis(payload.kpis)
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

  const cards = useMemo(
    () => [
      {
        key: "orders",
        label: "Commandes",
        value: String(kpis.ordersCount),
        icon: ClipboardList,
        href: "/admin/commandes",
      },
      {
        key: "revenue",
        label: "CA total",
        value: formatCurrency(kpis.revenueTotal),
        icon: Package,
        href: "/admin/dashboard",
      },
      {
        key: "users",
        label: "Utilisateurs",
        value: String(kpis.usersCount),
        icon: Users,
        href: "/admin/utilisateurs",
      },
      {
        key: "contact",
        label: "Messages contact en attente",
        value: String(kpis.pendingContactMessages),
        icon: Mail,
        href: "/admin/contact",
      },
      {
        key: "chatbot",
        label: "Escalades chatbot en cours",
        value: String(kpis.pendingChatbotConversations),
        icon: Bot,
        href: "/admin/chatbot",
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ key, label, value, icon: ItemIcon, href }) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Actions rapides</CardTitle>
          <CardDescription>
            Acces direct vers les sections operationnelles du backoffice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <Link
                href="/admin/produits"
                className="block rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
              >
                Gérer le catalogue produits
              </Link>
            </li>
            <li>
              <Link
                href="/admin/categories"
                className="block rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
              >
                Gérer les catégories
              </Link>
            </li>
            <li>
              <Link
                href="/admin/commandes"
                className="block rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
              >
                Suivre les commandes
              </Link>
            </li>
            <li>
              <Link
                href="/admin/contact"
                className="block rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
              >
                Traiter les messages contact
              </Link>
            </li>
            <li>
              <Link
                href="/admin/chatbot"
                className="block rounded-lg border border-border px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-50"
              >
                Suivre les escalades chatbot
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}
