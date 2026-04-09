import type {
  AdminOrdersFilters,
  AdminOrderSortBy,
  AdminOrderSortDirection,
} from "./adminOrdersTypes"

export const ADMIN_ORDERS_PAGE_SIZE_OPTIONS = [20, 50, 100] as const

export const DEFAULT_ADMIN_ORDERS_FILTERS: AdminOrdersFilters = {
  searchNumero: "",
  searchClientName: "",
  searchClientEmail: "",
  status: "all",
  paymentStatus: "all",
  paymentMethod: "all",
  sortBy: "date_commande",
  sortDirection: "desc",
  page: 1,
  pageSize: ADMIN_ORDERS_PAGE_SIZE_OPTIONS[0],
}

export const ADMIN_ORDER_SORT_LABELS: Record<AdminOrderSortBy, string> = {
  numero_commande: "Numero commande",
  date_commande: "Date et heure",
  client: "Client",
  montant_ttc: "Montant TTC",
  statut: "Statut commande",
  mode_paiement: "Mode paiement",
  statut_paiement: "Statut paiement",
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? "", 10)

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback
  }

  return parsedValue
}

export function parseAdminOrdersFiltersFromSearchParams(
  searchParams: URLSearchParams,
): AdminOrdersFilters {
  const statusValue = searchParams.get("status")
  const paymentStatusValue = searchParams.get("paymentStatus")
  const sortByValue = searchParams.get("sortBy")
  const sortDirectionValue = searchParams.get("sortDirection")

  return {
    searchNumero: (searchParams.get("searchNumero") ?? "").trim(),
    searchClientName: (searchParams.get("searchClientName") ?? "").trim(),
    searchClientEmail: (searchParams.get("searchClientEmail") ?? "").trim(),
    status:
      statusValue === "en_attente" ||
      statusValue === "en_cours" ||
      statusValue === "terminee" ||
      statusValue === "annulee"
        ? statusValue
        : "all",
    paymentStatus:
      paymentStatusValue === "valide" ||
      paymentStatusValue === "en_attente" ||
      paymentStatusValue === "echoue" ||
      paymentStatusValue === "rembourse"
        ? paymentStatusValue
        : "all",
    paymentMethod: (searchParams.get("paymentMethod") ?? "all").trim() || "all",
    sortBy:
      sortByValue === "numero_commande" ||
      sortByValue === "date_commande" ||
      sortByValue === "client" ||
      sortByValue === "montant_ttc" ||
      sortByValue === "statut" ||
      sortByValue === "mode_paiement" ||
      sortByValue === "statut_paiement"
        ? sortByValue
        : DEFAULT_ADMIN_ORDERS_FILTERS.sortBy,
    sortDirection:
      sortDirectionValue === "asc" || sortDirectionValue === "desc"
        ? sortDirectionValue
        : DEFAULT_ADMIN_ORDERS_FILTERS.sortDirection,
    page: parsePositiveInt(
      searchParams.get("page"),
      DEFAULT_ADMIN_ORDERS_FILTERS.page,
    ),
    pageSize: parsePositiveInt(
      searchParams.get("pageSize"),
      DEFAULT_ADMIN_ORDERS_FILTERS.pageSize,
    ),
  }
}

export function buildAdminOrdersQueryString(
  filters: AdminOrdersFilters,
): string {
  const searchParams = new URLSearchParams()

  if (filters.searchNumero.trim()) {
    searchParams.set("searchNumero", filters.searchNumero.trim())
  }

  if (filters.searchClientName.trim()) {
    searchParams.set("searchClientName", filters.searchClientName.trim())
  }

  if (filters.searchClientEmail.trim()) {
    searchParams.set("searchClientEmail", filters.searchClientEmail.trim())
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status)
  }

  if (filters.paymentStatus !== "all") {
    searchParams.set("paymentStatus", filters.paymentStatus)
  }

  if (filters.paymentMethod !== "all" && filters.paymentMethod.trim()) {
    searchParams.set("paymentMethod", filters.paymentMethod.trim())
  }

  searchParams.set("sortBy", filters.sortBy)
  searchParams.set("sortDirection", filters.sortDirection)
  searchParams.set("page", String(Math.max(1, filters.page)))
  searchParams.set("pageSize", String(Math.max(1, filters.pageSize)))

  return searchParams.toString()
}

export function getNextSortDirection(
  currentSortBy: AdminOrderSortBy,
  currentSortDirection: AdminOrderSortDirection,
  nextSortBy: AdminOrderSortBy,
): AdminOrderSortDirection {
  if (currentSortBy !== nextSortBy) {
    return "asc"
  }

  return currentSortDirection === "asc" ? "desc" : "asc"
}

export function mapPaymentStatusLabel(status: string): string {
  if (status === "valide") {
    return "Valide"
  }

  if (status === "en_attente") {
    return "En attente"
  }

  if (status === "echoue") {
    return "Echoue"
  }

  if (status === "rembourse") {
    return "Rembourse"
  }

  return status || "-"
}

export function mapPaymentStatusClassName(status: string): string {
  if (status === "valide") {
    return "bg-brand-success text-white"
  }

  if (status === "en_attente") {
    return "bg-brand-alert text-white"
  }

  if (status === "echoue") {
    return "bg-brand-error text-white"
  }

  if (status === "rembourse") {
    return "bg-slate-700 text-white"
  }

  return "bg-slate-200 text-slate-700"
}

export function mapPaymentStatusUi(status: string): {
  label: string
  className: string
} {
  return {
    label: mapPaymentStatusLabel(status),
    className: mapPaymentStatusClassName(status),
  }
}

export function mapPaymentMethodLabel(mode: string | null): string {
  if (!mode) {
    return "-"
  }

  if (mode === "carte") {
    return "Carte"
  }

  if (mode === "paypal") {
    return "PayPal"
  }

  if (mode === "virement") {
    return "Virement"
  }

  return mode
}
