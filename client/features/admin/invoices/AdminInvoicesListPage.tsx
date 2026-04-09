"use client"

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  Filter,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react"
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
import { formatCurrency, formatDate } from "@/features/admin/adminUtils"
import { Link, usePathname, useRouter } from "@/i18n/navigation"

import { fetchAdminInvoices } from "./adminInvoicesApi"
import type {
  AdminInvoiceListItem,
  AdminInvoicesFilters,
  AdminInvoicesListPayload,
} from "./adminInvoicesTypes"
import {
  ADMIN_BACKOFFICE_PAGE_SIZE_OPTIONS,
  ADMIN_INVOICES_SORT_LABELS,
  buildAdminInvoicesQueryString,
  DEFAULT_ADMIN_INVOICES_FILTERS,
  getNextSortDirection,
  mapInvoiceStatusUi,
  parseAdminInvoicesFiltersFromSearchParams,
} from "./adminInvoicesUtils"

function getInvoiceRowClassName(invoice: AdminInvoiceListItem): string {
  if (invoice.statut === "annule") {
    return "bg-red-50/50"
  }

  if (invoice.statut === "en_attente") {
    return "bg-amber-50/40"
  }

  return ""
}

export function AdminInvoicesListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const searchParamsSnapshot = searchParams.toString()

  const filters = useMemo(() => {
    return parseAdminInvoicesFiltersFromSearchParams(
      new URLSearchParams(searchParamsSnapshot),
    )
  }, [searchParamsSnapshot])

  const [searchNumeroDraft, setSearchNumeroDraft] = useState(
    filters.searchNumero,
  )
  const [searchClientDraft, setSearchClientDraft] = useState(
    filters.searchClient,
  )

  const [payload, setPayload] = useState<AdminInvoicesListPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setSearchNumeroDraft(filters.searchNumero)
    setSearchClientDraft(filters.searchClient)
  }, [filters.searchClient, filters.searchNumero])

  const replaceFiltersInUrl = useCallback(
    (nextFilters: AdminInvoicesFilters) => {
      const queryString = buildAdminInvoicesQueryString(nextFilters)
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
    },
    [pathname, router],
  )

  const loadInvoices = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextPayload = await fetchAdminInvoices(filters)
      setPayload(nextPayload)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les factures.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  const invoices = payload?.invoices ?? []
  const total = payload?.total ?? 0
  const page = payload?.page ?? filters.page
  const totalPages = payload?.totalPages ?? 1

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    replaceFiltersInUrl({
      ...filters,
      searchNumero: searchNumeroDraft,
      searchClient: searchClientDraft,
      page: 1,
    })
  }

  function handleResetFilters() {
    replaceFiltersInUrl({
      ...DEFAULT_ADMIN_INVOICES_FILTERS,
      pageSize: filters.pageSize,
    })
  }

  function handleSort(sortBy: AdminInvoicesFilters["sortBy"]) {
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
    <section className="space-y-6" aria-labelledby="admin-invoices-list-title">
      <header className="space-y-1">
        <h1
          id="admin-invoices-list-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Gestion des factures
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Vue operationnelle des factures avec navigation croisee commande,
          client et avoirs.
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
          <CardTitle className="text-xl text-brand-nav">
            Recherche, filtres et tri
          </CardTitle>
          <CardDescription>
            Recherche par numero/client, filtre statut/date, tri ascendant et
            descendant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="grid gap-3 xl:grid-cols-[1fr_1fr_auto_auto]"
            onSubmit={handleSearchSubmit}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche numero facture</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchNumeroDraft}
                  onChange={(event) => {
                    setSearchNumeroDraft(event.target.value)
                  }}
                  placeholder="FAC-2026-0001"
                  className="h-10 w-full rounded-md border border-border pl-9 pr-3"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche client (nom ou email)</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchClientDraft}
                  onChange={(event) => {
                    setSearchClientDraft(event.target.value)
                  }}
                  placeholder="Nom client ou email"
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
              <span>Statut facture</span>
              <select
                value={filters.status}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    status: event.target
                      .value as AdminInvoicesFilters["status"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                <option value="payee">Payee</option>
                <option value="en_attente">En attente</option>
                <option value="annule">Annulee</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Date de</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    dateFrom: event.target.value,
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Date a</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    dateTo: event.target.value,
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Trier par</span>
              <select
                value={filters.sortBy}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    sortBy: event.target
                      .value as AdminInvoicesFilters["sortBy"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                {Object.entries(ADMIN_INVOICES_SORT_LABELS).map(
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
                      .value as AdminInvoicesFilters["sortDirection"],
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
                {ADMIN_BACKOFFICE_PAGE_SIZE_OPTIONS.map((pageSizeOption) => (
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
            Liste factures
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement des factures..."
              : `${total} facture(s) trouvee(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-[1600px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("numero_facture")
                      }}
                    >
                      N facture
                      {filters.sortBy === "numero_facture" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("date_emission")
                      }}
                    >
                      Date emission
                      {filters.sortBy === "date_emission" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("client")
                      }}
                    >
                      Client
                      {filters.sortBy === "client" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">Commande associee</th>
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("montant_ttc")
                      }}
                    >
                      Montant TTC
                      {filters.sortBy === "montant_ttc" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("statut")
                      }}
                    >
                      Statut
                      {filters.sortBy === "statut" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">PDF</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2 py-8 text-center text-slate-500"
                    >
                      Aucune facture correspondante.
                    </td>
                  </tr>
                ) : null}

                {invoices.map((invoice) => {
                  const statusUi = mapInvoiceStatusUi(invoice.statut)

                  return (
                    <tr
                      key={invoice.id_facture}
                      className={`border-b border-border/60 align-top ${getInvoiceRowClassName(
                        invoice,
                      )}`}
                    >
                      <td className="px-2 py-3">
                        <p className="font-medium text-brand-nav">
                          {invoice.numero_facture}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {invoice.id_facture}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatDate(invoice.date_emission)}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        <p>{invoice.client?.nom_complet || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {invoice.client?.email || "-"}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        {invoice.commande ? (
                          <Link
                            href={`/admin/commandes/${invoice.commande.id_commande}`}
                            className="text-brand-cta underline underline-offset-2"
                          >
                            {invoice.commande.numero_commande}
                          </Link>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatCurrency(invoice.montant_ttc)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge className={statusUi.className}>
                          {statusUi.label}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        {invoice.pdf_url ? (
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={invoice.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              PDF
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Indisponible
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/admin/factures/${invoice.id_facture}`}
                            >
                              <Eye className="size-3.5" aria-hidden="true" />
                              Detail
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/admin/factures/${invoice.id_facture}/edition`}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                              Editer
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-slate-600">
              Page {page} / {totalPages} · Tri:{" "}
              {ADMIN_INVOICES_SORT_LABELS[filters.sortBy]} (
              {filters.sortDirection})
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handlePageChange(Math.max(1, page - 1))
                }}
                disabled={page <= 1 || isLoading}
              >
                Precedent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handlePageChange(Math.min(totalPages, page + 1))
                }}
                disabled={page >= totalPages || isLoading}
              >
                Suivant
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void loadInvoices()
                }}
                disabled={isLoading}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Rafraichir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
