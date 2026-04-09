import type {
  AdminUsersFilters,
  AdminUserSortBy,
  AdminUserSortDirection,
} from "./adminUsersTypes"

export const DEFAULT_ADMIN_USERS_PAGE_SIZE = 20

export const ADMIN_USERS_SORT_LABELS: Record<AdminUserSortBy, string> = {
  nom: "Nom",
  date_inscription: "Date d'inscription",
  nombre_commandes: "Nombre de commandes",
  ca_total: "CA total",
  derniere_connexion: "Derniere connexion",
}

export const DEFAULT_ADMIN_USERS_FILTERS: AdminUsersFilters = {
  searchName: "",
  searchEmail: "",
  status: "all",
  sortBy: "date_inscription",
  sortDirection: "desc",
  page: 1,
  pageSize: DEFAULT_ADMIN_USERS_PAGE_SIZE,
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? "", 10)

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback
  }

  return parsedValue
}

export function parseAdminUsersFiltersFromSearchParams(
  searchParams: URLSearchParams,
): AdminUsersFilters {
  const statusValue = searchParams.get("status")
  const sortByValue = searchParams.get("sortBy")
  const sortDirectionValue = searchParams.get("sortDirection")

  return {
    searchName: (searchParams.get("searchName") ?? "").trim(),
    searchEmail: (searchParams.get("searchEmail") ?? "").trim(),
    status:
      statusValue === "actif" ||
      statusValue === "inactif" ||
      statusValue === "en_attente"
        ? statusValue
        : "all",
    sortBy:
      sortByValue === "nom" ||
      sortByValue === "date_inscription" ||
      sortByValue === "nombre_commandes" ||
      sortByValue === "ca_total" ||
      sortByValue === "derniere_connexion"
        ? sortByValue
        : DEFAULT_ADMIN_USERS_FILTERS.sortBy,
    sortDirection:
      sortDirectionValue === "asc" || sortDirectionValue === "desc"
        ? sortDirectionValue
        : DEFAULT_ADMIN_USERS_FILTERS.sortDirection,
    page: parsePositiveInt(searchParams.get("page"), 1),
    pageSize: parsePositiveInt(
      searchParams.get("pageSize"),
      DEFAULT_ADMIN_USERS_FILTERS.pageSize,
    ),
  }
}

export function buildAdminUsersQueryString(filters: AdminUsersFilters): string {
  const searchParams = new URLSearchParams()

  if (filters.searchName.trim()) {
    searchParams.set("searchName", filters.searchName.trim())
  }

  if (filters.searchEmail.trim()) {
    searchParams.set("searchEmail", filters.searchEmail.trim())
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status)
  }

  searchParams.set("sortBy", filters.sortBy)
  searchParams.set("sortDirection", filters.sortDirection)
  searchParams.set("page", String(Math.max(1, filters.page)))
  searchParams.set("pageSize", String(Math.max(1, filters.pageSize)))

  return searchParams.toString()
}

export function mapUserStatusLabel(status: string): string {
  if (status === "actif") {
    return "Actif"
  }

  if (status === "inactif") {
    return "Inactif"
  }

  return "En attente"
}

export function mapUserStatusClassName(status: string): string {
  if (status === "actif") {
    return "bg-brand-success text-white"
  }

  if (status === "inactif") {
    return "bg-brand-error text-white"
  }

  return "bg-brand-alert text-white"
}

export function mapUserStatusUi(status: string): {
  label: string
  className: string
} {
  return {
    label: mapUserStatusLabel(status),
    className: mapUserStatusClassName(status),
  }
}

export function getNextSortDirection(
  currentSortBy: AdminUserSortBy,
  currentSortDirection: AdminUserSortDirection,
  nextSortBy: AdminUserSortBy,
): AdminUserSortDirection {
  if (currentSortBy !== nextSortBy) {
    return "asc"
  }

  return currentSortDirection === "asc" ? "desc" : "asc"
}

export function truncateBillingAddresses(addresses: string[]): {
  preview: string[]
  remainingCount: number
} {
  const preview = addresses.slice(0, 2)
  const remainingCount = Math.max(0, addresses.length - preview.length)

  return {
    preview,
    remainingCount,
  }
}
