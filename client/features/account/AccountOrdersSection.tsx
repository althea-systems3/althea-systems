"use client"

import { FileText, Loader2, Search } from "lucide-react"
import { useLocale } from "next-intl"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import type { AccountOrderSummary, AccountOrderType } from "./accountTypes"
import {
  formatAccountDate,
  formatAccountPrice,
  getOrderTypeLabel,
  getOrderYear,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "./accountUtils"

type OrderYearGroup = {
  year: number
  orders: AccountOrderSummary[]
}

const ALL_FILTER_VALUE = "all"

function buildOrderDateSearchTokens(
  createdAt: string,
  locale: string,
): string[] {
  const parsedDate = new Date(createdAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return []
  }

  return [
    formatAccountDate(createdAt, locale),
    new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(parsedDate),
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsedDate),
    parsedDate.toISOString().slice(0, 10),
    String(parsedDate.getFullYear()),
  ]
}

function getOrderProductSummary(order: AccountOrderSummary): string {
  if (order.productNames.length === 0) {
    return "Aucun produit associe"
  }

  const productPreview = order.productNames.slice(0, 2)
  const remainingCount = order.productNames.length - productPreview.length

  if (remainingCount <= 0) {
    return productPreview.join(", ")
  }

  return `${productPreview.join(", ")} +${remainingCount}`
}

function formatOrderCount(orderCount: number): string {
  return `${orderCount} commande${orderCount > 1 ? "s" : ""}`
}

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
  const [searchValue, setSearchValue] = useState("")
  const [selectedYear, setSelectedYear] = useState(ALL_FILTER_VALUE)
  const [selectedOrderType, setSelectedOrderType] = useState(ALL_FILTER_VALUE)
  const [selectedStatus, setSelectedStatus] = useState(ALL_FILTER_VALUE)

  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase(locale)

  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (orderA, orderB) =>
        new Date(orderB.createdAt).getTime() -
        new Date(orderA.createdAt).getTime(),
    )
  }, [orders])

  const availableYears = useMemo(() => {
    const yearSet = new Set(
      sortedOrders
        .map((order) => getOrderYear(order.createdAt))
        .filter((year) => year > 0),
    )

    return Array.from(yearSet).sort((yearA, yearB) => yearB - yearA)
  }, [sortedOrders])

  const availableStatuses = useMemo(() => {
    const statuses = new Set(sortedOrders.map((order) => order.status))
    return Array.from(statuses)
  }, [sortedOrders])

  const filteredOrders = useMemo(() => {
    const selectedYearAsNumber = Number(selectedYear)

    return sortedOrders.filter((order) => {
      const orderYear = getOrderYear(order.createdAt)

      if (
        selectedYear !== ALL_FILTER_VALUE &&
        orderYear !== selectedYearAsNumber
      ) {
        return false
      }

      if (
        selectedOrderType !== ALL_FILTER_VALUE &&
        order.orderType !== selectedOrderType
      ) {
        return false
      }

      if (
        selectedStatus !== ALL_FILTER_VALUE &&
        order.status !== selectedStatus
      ) {
        return false
      }

      if (!normalizedSearchValue) {
        return true
      }

      const searchableChunks = [
        order.orderNumber,
        ...order.productNames,
        ...buildOrderDateSearchTokens(order.createdAt, locale),
      ]

      const searchableText = searchableChunks
        .join(" ")
        .toLocaleLowerCase(locale)

      return searchableText.includes(normalizedSearchValue)
    })
  }, [
    locale,
    normalizedSearchValue,
    selectedOrderType,
    selectedStatus,
    selectedYear,
    sortedOrders,
  ])

  const groupedOrders = useMemo<OrderYearGroup[]>(() => {
    const groups = new Map<number, AccountOrderSummary[]>()

    for (const order of filteredOrders) {
      const orderYear = getOrderYear(order.createdAt)

      if (groups.has(orderYear)) {
        groups.get(orderYear)?.push(order)
      } else {
        groups.set(orderYear, [order])
      }
    }

    return Array.from(groups.entries())
      .sort(([yearA], [yearB]) => yearB - yearA)
      .map(([year, yearOrders]) => ({
        year,
        orders: yearOrders,
      }))
  }, [filteredOrders])

  const hasActiveFilters =
    searchValue.trim().length > 0 ||
    selectedYear !== ALL_FILTER_VALUE ||
    selectedOrderType !== ALL_FILTER_VALUE ||
    selectedStatus !== ALL_FILTER_VALUE

  function resetFilters() {
    setSearchValue("")
    setSelectedYear(ALL_FILTER_VALUE)
    setSelectedOrderType(ALL_FILTER_VALUE)
    setSelectedStatus(ALL_FILTER_VALUE)
  }

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

        const rawOrders = Array.isArray(payload?.orders)
          ? (payload.orders as AccountOrderSummary[])
          : []

        const normalizedOrders = rawOrders.map((order) => {
          const productNames = Array.isArray(order.productNames)
            ? order.productNames
            : []
          const inferredOrderType: AccountOrderType =
            order.orderType === "multi_produits" || productNames.length > 1
              ? "multi_produits"
              : "mono_produit"

          return {
            ...order,
            orderType: inferredOrderType,
            productNames,
            productCount:
              typeof order.productCount === "number"
                ? order.productCount
                : productNames.length,
          }
        })

        setOrders(normalizedOrders)
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

      <section
        className="rounded-xl border border-border p-4"
        aria-label="Recherche et filtres commandes"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label
              htmlFor="orders-search"
              className="text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Rechercher
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="orders-search"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Produit, numero, date..."
                className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-brand-nav shadow-sm outline-none transition focus:border-brand-cta focus:ring-2 focus:ring-brand-cta/25"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="orders-year-filter"
              className="text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Annee
            </label>
            <select
              id="orders-year-filter"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-brand-nav shadow-sm outline-none transition focus:border-brand-cta focus:ring-2 focus:ring-brand-cta/25"
            >
              <option value={ALL_FILTER_VALUE}>Toutes</option>
              {availableYears.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="orders-type-filter"
              className="text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Type de commande
            </label>
            <select
              id="orders-type-filter"
              value={selectedOrderType}
              onChange={(event) => setSelectedOrderType(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-brand-nav shadow-sm outline-none transition focus:border-brand-cta focus:ring-2 focus:ring-brand-cta/25"
            >
              <option value={ALL_FILTER_VALUE}>Tous</option>
              <option value="mono_produit">Mono-produit</option>
              <option value="multi_produits">Multi-produits</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="orders-status-filter"
              className="text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Statut
            </label>
            <select
              id="orders-status-filter"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-brand-nav shadow-sm outline-none transition focus:border-brand-cta focus:ring-2 focus:ring-brand-cta/25"
            >
              <option value={ALL_FILTER_VALUE}>Tous</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {getOrderStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500" aria-live="polite">
            {formatOrderCount(filteredOrders.length)} trouvee(s)
          </p>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
            >
              Reinitialiser les filtres
            </Button>
          ) : null}
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border p-6 text-center">
          <h3 className="text-sm font-semibold text-brand-nav">
            Aucun resultat pour cette recherche
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Essaie un autre produit, une autre annee ou ajuste les filtres.
          </p>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={resetFilters}
            >
              Revenir a l&apos;historique complet
            </Button>
          ) : null}
        </section>
      ) : null}

      {groupedOrders.map((group) => (
        <section
          key={group.year}
          className="space-y-3"
          aria-labelledby={`orders-year-${group.year}`}
        >
          <div className="flex items-center justify-between border-b border-border pb-1">
            <h3
              id={`orders-year-${group.year}`}
              className="heading-font text-lg text-brand-nav"
            >
              {group.year}
            </h3>
            <p className="text-xs text-slate-500">
              {formatOrderCount(group.orders.length)}
            </p>
          </div>

          <ul className="space-y-3">
            {group.orders.map((order) => (
              <li key={order.id}>
                <article className="rounded-xl border border-border p-4">
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

                  <p className="mt-2 text-sm text-slate-600">
                    {getOrderProductSummary(order)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                      {getOrderStatusLabel(order.status)}
                    </span>
                    <span className="rounded-full bg-[#10b981]/10 px-2 py-1 text-[#0f766e]">
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </span>
                    <span className="rounded-full bg-[#0369a1]/10 px-2 py-1 text-[#075985]">
                      {getOrderTypeLabel(order.orderType)}
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
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
