import type {
  AdminCreditNotesFilters,
  AdminCreditNotesSortBy,
  AdminInvoicesFilters,
  AdminInvoicesSortBy,
  AdminSortDirection,
} from "./adminInvoicesTypes"

export const ADMIN_BACKOFFICE_PAGE_SIZE_OPTIONS = [20, 50, 100] as const

export const DEFAULT_ADMIN_INVOICES_FILTERS: AdminInvoicesFilters = {
  searchNumero: "",
  searchClient: "",
  status: "all",
  dateFrom: "",
  dateTo: "",
  sortBy: "date_emission",
  sortDirection: "desc",
  page: 1,
  pageSize: ADMIN_BACKOFFICE_PAGE_SIZE_OPTIONS[0],
}

export const DEFAULT_ADMIN_CREDIT_NOTES_FILTERS: AdminCreditNotesFilters = {
  searchNumero: "",
  searchClient: "",
  motif: "all",
  dateFrom: "",
  dateTo: "",
  sortBy: "date_emission",
  sortDirection: "desc",
  page: 1,
  pageSize: ADMIN_BACKOFFICE_PAGE_SIZE_OPTIONS[0],
}

export const ADMIN_INVOICES_SORT_LABELS: Record<AdminInvoicesSortBy, string> = {
  numero_facture: "Numero facture",
  date_emission: "Date emission",
  client: "Client",
  montant_ttc: "Montant TTC",
  statut: "Statut",
}

export const ADMIN_CREDIT_NOTES_SORT_LABELS: Record<
  AdminCreditNotesSortBy,
  string
> = {
  numero_avoir: "Numero avoir",
  date_emission: "Date emission",
  client: "Client",
  montant: "Montant",
  motif: "Motif",
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? "", 10)

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback
  }

  return parsedValue
}

function parseDateInputValue(value: string | null): string {
  const normalizedValue = (value ?? "").trim()

  if (!normalizedValue) {
    return ""
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return ""
  }

  return normalizedValue
}

export function parseAdminInvoicesFiltersFromSearchParams(
  searchParams: URLSearchParams,
): AdminInvoicesFilters {
  const statusValue = searchParams.get("status")
  const sortByValue = searchParams.get("sortBy")
  const sortDirectionValue = searchParams.get("sortDirection")

  return {
    searchNumero: (searchParams.get("searchNumero") ?? "").trim(),
    searchClient: (searchParams.get("searchClient") ?? "").trim(),
    status:
      statusValue === "payee" ||
      statusValue === "en_attente" ||
      statusValue === "annule"
        ? statusValue
        : "all",
    dateFrom: parseDateInputValue(searchParams.get("dateFrom")),
    dateTo: parseDateInputValue(searchParams.get("dateTo")),
    sortBy:
      sortByValue === "numero_facture" ||
      sortByValue === "date_emission" ||
      sortByValue === "client" ||
      sortByValue === "montant_ttc" ||
      sortByValue === "statut"
        ? sortByValue
        : DEFAULT_ADMIN_INVOICES_FILTERS.sortBy,
    sortDirection:
      sortDirectionValue === "asc" || sortDirectionValue === "desc"
        ? sortDirectionValue
        : DEFAULT_ADMIN_INVOICES_FILTERS.sortDirection,
    page: parsePositiveInt(
      searchParams.get("page"),
      DEFAULT_ADMIN_INVOICES_FILTERS.page,
    ),
    pageSize: parsePositiveInt(
      searchParams.get("pageSize"),
      DEFAULT_ADMIN_INVOICES_FILTERS.pageSize,
    ),
  }
}

export function buildAdminInvoicesQueryString(
  filters: AdminInvoicesFilters,
): string {
  const searchParams = new URLSearchParams()

  if (filters.searchNumero.trim()) {
    searchParams.set("searchNumero", filters.searchNumero.trim())
  }

  if (filters.searchClient.trim()) {
    searchParams.set("searchClient", filters.searchClient.trim())
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status)
  }

  if (filters.dateFrom) {
    searchParams.set("dateFrom", filters.dateFrom)
  }

  if (filters.dateTo) {
    searchParams.set("dateTo", filters.dateTo)
  }

  searchParams.set("sortBy", filters.sortBy)
  searchParams.set("sortDirection", filters.sortDirection)
  searchParams.set("page", String(Math.max(1, filters.page)))
  searchParams.set("pageSize", String(Math.max(1, filters.pageSize)))

  return searchParams.toString()
}

export function parseAdminCreditNotesFiltersFromSearchParams(
  searchParams: URLSearchParams,
): AdminCreditNotesFilters {
  const motifValue = searchParams.get("motif")
  const sortByValue = searchParams.get("sortBy")
  const sortDirectionValue = searchParams.get("sortDirection")

  return {
    searchNumero: (searchParams.get("searchNumero") ?? "").trim(),
    searchClient: (searchParams.get("searchClient") ?? "").trim(),
    motif:
      motifValue === "annulation" ||
      motifValue === "remboursement" ||
      motifValue === "erreur"
        ? motifValue
        : "all",
    dateFrom: parseDateInputValue(searchParams.get("dateFrom")),
    dateTo: parseDateInputValue(searchParams.get("dateTo")),
    sortBy:
      sortByValue === "numero_avoir" ||
      sortByValue === "date_emission" ||
      sortByValue === "client" ||
      sortByValue === "montant" ||
      sortByValue === "motif"
        ? sortByValue
        : DEFAULT_ADMIN_CREDIT_NOTES_FILTERS.sortBy,
    sortDirection:
      sortDirectionValue === "asc" || sortDirectionValue === "desc"
        ? sortDirectionValue
        : DEFAULT_ADMIN_CREDIT_NOTES_FILTERS.sortDirection,
    page: parsePositiveInt(
      searchParams.get("page"),
      DEFAULT_ADMIN_CREDIT_NOTES_FILTERS.page,
    ),
    pageSize: parsePositiveInt(
      searchParams.get("pageSize"),
      DEFAULT_ADMIN_CREDIT_NOTES_FILTERS.pageSize,
    ),
  }
}

export function buildAdminCreditNotesQueryString(
  filters: AdminCreditNotesFilters,
): string {
  const searchParams = new URLSearchParams()

  if (filters.searchNumero.trim()) {
    searchParams.set("searchNumero", filters.searchNumero.trim())
  }

  if (filters.searchClient.trim()) {
    searchParams.set("searchClient", filters.searchClient.trim())
  }

  if (filters.motif !== "all") {
    searchParams.set("motif", filters.motif)
  }

  if (filters.dateFrom) {
    searchParams.set("dateFrom", filters.dateFrom)
  }

  if (filters.dateTo) {
    searchParams.set("dateTo", filters.dateTo)
  }

  searchParams.set("sortBy", filters.sortBy)
  searchParams.set("sortDirection", filters.sortDirection)
  searchParams.set("page", String(Math.max(1, filters.page)))
  searchParams.set("pageSize", String(Math.max(1, filters.pageSize)))

  return searchParams.toString()
}

export function getNextSortDirection(
  currentSortBy: string,
  currentSortDirection: AdminSortDirection,
  nextSortBy: string,
): AdminSortDirection {
  if (currentSortBy !== nextSortBy) {
    return "asc"
  }

  return currentSortDirection === "asc" ? "desc" : "asc"
}

export function mapInvoiceStatusLabel(status: string): string {
  if (status === "payee") {
    return "Payee"
  }

  if (status === "en_attente") {
    return "En attente"
  }

  if (status === "annule") {
    return "Annulee"
  }

  return status || "-"
}

export function mapInvoiceStatusClassName(status: string): string {
  if (status === "payee") {
    return "bg-brand-success text-white"
  }

  if (status === "en_attente") {
    return "bg-brand-alert text-white"
  }

  if (status === "annule") {
    return "bg-brand-error text-white"
  }

  return "bg-slate-200 text-slate-700"
}

export function mapInvoiceStatusUi(status: string): {
  label: string
  className: string
} {
  return {
    label: mapInvoiceStatusLabel(status),
    className: mapInvoiceStatusClassName(status),
  }
}

export function mapCreditNoteMotifLabel(motif: string): string {
  if (motif === "annulation") {
    return "Annulation"
  }

  if (motif === "remboursement") {
    return "Remboursement"
  }

  if (motif === "erreur") {
    return "Erreur"
  }

  return motif || "-"
}

export function mapCreditNoteMotifClassName(motif: string): string {
  if (motif === "annulation") {
    return "bg-slate-700 text-white"
  }

  if (motif === "remboursement") {
    return "bg-brand-cta text-white"
  }

  if (motif === "erreur") {
    return "bg-brand-error text-white"
  }

  return "bg-slate-200 text-slate-700"
}

export function mapCreditNoteMotifUi(motif: string): {
  label: string
  className: string
} {
  return {
    label: mapCreditNoteMotifLabel(motif),
    className: mapCreditNoteMotifClassName(motif),
  }
}
