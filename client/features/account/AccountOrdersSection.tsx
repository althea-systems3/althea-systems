"use client"

import { FileText, Loader2 } from "lucide-react"
import { useLocale } from "next-intl"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import type { AccountOrderSummary } from "./accountTypes"
import {
  formatAccountDate,
  formatAccountPrice,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "./accountUtils"

function getSessionExpiredPath(pathname: string): string {
  const query = new URLSearchParams({
    reason: "session_expired",
    next: pathname,
  })

  return `/connexion?${query.toString()}`
}

export function AccountOrdersSection() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const [orders, setOrders] = useState<AccountOrderSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadOrders = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch("/api/account/orders", {
          cache: "no-store",
        })

        if (response.status === 401) {
          router.replace(getSessionExpiredPath(pathname))
          return
        }

        if (!response.ok) {
          if (isMounted) {
            setErrorMessage("Impossible de charger les commandes.")
          }
          return
        }

        const payload = await response.json().catch(() => null)

        if (!isMounted) {
          return
        }

        setOrders(
          Array.isArray(payload?.orders)
            ? (payload.orders as AccountOrderSummary[])
            : [],
        )
      } catch (error) {
        console.error("Erreur chargement commandes compte", { error })

        if (isMounted) {
          setErrorMessage(
            "Une erreur temporaire est survenue pendant le chargement.",
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadOrders()

    return () => {
      isMounted = false
    }
  }, [pathname, router])

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-slate-600"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Chargement des commandes...
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-error" role="alert">
          {errorMessage}
        </p>
        <Button type="button" onClick={() => router.refresh()}>
          Reessayer
        </Button>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="heading-font text-xl text-brand-nav">Mes commandes</h2>
        <p className="text-sm text-slate-600">
          Aucune commande n&apos;a encore ete enregistree sur ton compte.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="heading-font text-xl text-brand-nav">Mes commandes</h2>
        <p className="text-sm text-slate-600">
          Retrouve le statut de tes commandes et accede a tes documents.
        </p>
      </header>

      <div className="space-y-3">
        {orders.map((order) => (
          <article
            key={order.id}
            className="rounded-xl border border-border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-brand-nav">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {formatAccountDate(order.createdAt, locale)}
                </p>
              </div>
              <p className="text-sm font-medium text-brand-nav">
                {formatAccountPrice(order.totalTtc, locale)}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                {getOrderStatusLabel(order.status)}
              </span>
              <span className="rounded-full bg-[#10b981]/10 px-2 py-1 text-[#0f766e]">
                {getPaymentStatusLabel(order.paymentStatus)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                className="bg-brand-cta text-white hover:bg-brand-cta/90"
              >
                <Link href={`/mon-compte/commandes/${order.orderNumber}`}>
                  Voir le detail
                </Link>
              </Button>

              {order.invoice?.pdfUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={order.invoice.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    Telecharger la facture
                  </a>
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  Facture indisponible
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
