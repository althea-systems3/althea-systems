"use client"

import { Eye, Filter, Search } from "lucide-react"
import { useSearchParams } from "next/navigation"
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatCurrency,
  formatDate,
  mapOrderStatusClassName,
  mapOrderStatusLabel,
} from "@/features/admin/adminUtils"
import {
  AdminListErrorAlert,
  AdminListPagination,
  AdminSortButton,
} from "@/features/admin/shared"
import { Link, usePathname, useRouter } from "@/i18n/navigation"

import { fetchAdminOrders } from "./adminOrdersApi"
import type {
  AdminOrderListItem,
  AdminOrdersFilters,
  AdminOrdersListPayload,
} from "./adminOrdersTypes"
import {
  ADMIN_ORDERS_PAGE_SIZE_OPTIONS,
  ADMIN_ORDER_SORT_LABELS,
  buildAdminOrdersQueryString,
  DEFAULT_ADMIN_ORDERS_FILTERS,
  getNextSortDirection,
  mapPaymentMethodLabel,
  mapPaymentStatusUi,
  parseAdminOrdersFiltersFromSearchParams,
} from "./adminOrdersUtils"

function getProblematicRowClassName(order: AdminOrderListItem): string {
  if (order.statut === "annulee") {
    return "bg-red-50/50"
  }

  if (order.statut === "en_attente") {
    return "bg-amber-50/40"
  }

  return ""
}

export function AdminOrdersListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const searchParamsSnapshot = searchParams.toString()

  const filters = useMemo(() => {
    return parseAdminOrdersFiltersFromSearchParams(
      new URLSearchParams(searchParamsSnapshot),
    )
  }, [searchParamsSnapshot])

  const [searchNumeroDraft, setSearchNumeroDraft] = useState(
    filters.searchNumero,
  )
  const [searchClientNameDraft, setSearchClientNameDraft] = useState(
    filters.searchClientName,
  )
  const [searchClientEmailDraft, setSearchClientEmailDraft] = useState(
    filters.searchClientEmail,
  )

  const [ordersPayload, setOrdersPayload] =
    useState<AdminOrdersListPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setSearchNumeroDraft(filters.searchNumero)
    setSearchClientNameDraft(filters.searchClientName)
    setSearchClientEmailDraft(filters.searchClientEmail)
  }, [
    filters.searchNumero,
    filters.searchClientName,
    filters.searchClientEmail,
  ])

  const replaceFiltersInUrl = useCallback(
    (nextFilters: AdminOrdersFilters) => {
      const queryString = buildAdminOrdersQueryString(nextFilters)
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
    },
    [pathname, router],
  )

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const payload = await fetchAdminOrders(filters)
      setOrdersPayload(payload)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les commandes.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const orders = ordersPayload?.orders ?? []
  const paymentMethods = ordersPayload?.paymentMethods ?? []
  const total = ordersPayload?.total ?? 0
  const page = ordersPayload?.page ?? filters.page
  const totalPages = ordersPayload?.totalPages ?? 1

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    replaceFiltersInUrl({
      ...filters,
      searchNumero: searchNumeroDraft,
      searchClientName: searchClientNameDraft,
      searchClientEmail: searchClientEmailDraft,
      page: 1,
    })
  }

  function handleResetFilters() {
    replaceFiltersInUrl({
      ...DEFAULT_ADMIN_ORDERS_FILTERS,
      pageSize: filters.pageSize,
    })
  }

  function handleSort(sortBy: AdminOrdersFilters["sortBy"]) {
    replaceFiltersInUrl({
      ...filters,
      sortBy,
      sortDirection: getNextSortDirection(
        filters.sortBy,
        filters.sortDirection,
        sortBy,
      ),
      page: 1,
    })
  }

  function handlePageChange(nextPage: number) {
    replaceFiltersInUrl({
      ...filters,
      page: nextPage,
    })
  }

  return (
    <section className="space-y-6" aria-labelledby="admin-orders-list-title">
      <header className="space-y-1">
        <h1
          id="admin-orders-list-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Gestion des commandes
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Suivi d&apos;exploitation des commandes, statuts de traitement et
          paiements.
        </p>
      </header>

      <AdminListErrorAlert message={errorMessage} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Recherche, filtres et tri
          </CardTitle>
          <CardDescription>
            Recherchez par numero, client ou email, puis triez selon les besoins
            support et operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto_auto]"
            onSubmit={handleSearchSubmit}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche numero commande</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchNumeroDraft}
                  onChange={(event) => {
                    setSearchNumeroDraft(event.target.value)
                  }}
                  placeholder="CMD-2026-0001"
                  className="h-10 w-full rounded-md border border-border pl-9 pr-3"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche nom client</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchClientNameDraft}
                  onChange={(event) => {
                    setSearchClientNameDraft(event.target.value)
                  }}
                  placeholder="Nom complet"
                  className="h-10 w-full rounded-md border border-border pl-9 pr-3"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche email client</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchClientEmailDraft}
                  onChange={(event) => {
                    setSearchClientEmailDraft(event.target.value)
                  }}
                  placeholder="client@domaine.com"
                  className="h-10 w-full rounded-md border border-border pl-9 pr-3"
                />
              </div>
            </label>

            <div className="flex items-end">
              <Button type="submit" className="w-full xl:w-auto">
                <Filter className="size-4" aria-hidden="true" />
                Filtrer
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full xl:w-auto"
                onClick={handleResetFilters}
              >
                Reinit.
              </Button>
            </div>
          </form>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Statut commande</span>
              <select
                value={filters.status}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    status: event.target.value as AdminOrdersFilters["status"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminee</option>
                <option value="annulee">Annulee</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Statut paiement</span>
              <select
                value={filters.paymentStatus}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    paymentStatus: event.target
                      .value as AdminOrdersFilters["paymentStatus"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                <option value="valide">Valide</option>
                <option value="en_attente">En attente</option>
                <option value="echoue">Echoue</option>
                <option value="rembourse">Rembourse</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Mode paiement</span>
              <select
                value={filters.paymentMethod}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    paymentMethod: event.target.value,
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                {paymentMethods.map((paymentMethod) => (
                  <option key={paymentMethod} value={paymentMethod}>
                    {mapPaymentMethodLabel(paymentMethod)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Trier par</span>
              <select
                value={filters.sortBy}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    sortBy: event.target.value as AdminOrdersFilters["sortBy"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                {Object.entries(ADMIN_ORDER_SORT_LABELS).map(
                  ([sortKey, sortLabel]) => (
                    <option key={sortKey} value={sortKey}>
                      {sortLabel}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Direction</span>
              <select
                value={filters.sortDirection}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    sortDirection: event.target
                      .value as AdminOrdersFilters["sortDirection"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="asc">Ascendant</option>
                <option value="desc">Descendant</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Taille page</span>
              <select
                value={filters.pageSize}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    pageSize: Number(event.target.value),
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                {ADMIN_ORDERS_PAGE_SIZE_OPTIONS.map((pageSizeOption) => (
                  <option key={pageSizeOption} value={pageSizeOption}>
                    {pageSizeOption}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Liste commandes
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement des commandes..."
              : `${total} commande(s) trouvee(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="numero_commande"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      N de commande
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="date_commande"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Date et heure
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="client"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Client
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="montant_ttc"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Montant TTC
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">Statut</th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="mode_paiement"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Mode paiement
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">Statut paiement</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2 py-8 text-center text-slate-500"
                    >
                      Aucune commande correspondante.
                    </td>
                  </tr>
                ) : null}

                {orders.map((order) => {
                  const paymentStatusUi = mapPaymentStatusUi(
                    order.statut_paiement,
                  )

                  return (
                    <tr
                      key={order.id_commande}
                      className={`border-b border-border/60 align-top ${getProblematicRowClassName(
                        order,
                      )}`}
                    >
                      <td className="px-2 py-3">
                        <p className="font-medium text-brand-nav">
                          {order.numero_commande}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.id_commande}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatDate(order.date_commande)}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        <p>{order.client?.nom_complet || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.client?.email || "-"}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatCurrency(order.montant_ttc)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          className={`border-transparent ${mapOrderStatusClassName(
                            order.statut,
                          )}`}
                        >
                          {mapOrderStatusLabel(order.statut)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {mapPaymentMethodLabel(order.mode_paiement)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge className={paymentStatusUi.className}>
                          {paymentStatusUi.label}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/commandes/${order.id_commande}`}>
                            <Eye className="size-3.5" aria-hidden="true" />
                            Detail
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <AdminListPagination
            page={page}
            totalPages={totalPages}
            isLoading={isLoading}
            summaryText={`Page ${page} / ${totalPages} · Tri: ${ADMIN_ORDER_SORT_LABELS[filters.sortBy]} (${filters.sortDirection})`}
            onPageChange={handlePageChange}
            onRefresh={() => void loadOrders()}
          />
        </CardContent>
      </Card>
    </section>
  )
}
