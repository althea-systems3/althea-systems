import {
  SEARCH_ALLOWED_SORT_BY,
  SEARCH_ALLOWED_SORT_ORDER,
  SEARCH_DEFAULT_FILTERS,
  SEARCH_DEFAULT_SORT_BY,
  SEARCH_DEFAULT_SORT_ORDER,
  SEARCH_RESULTS_PAGE_LIMIT,
} from "./searchConstants"
import type {
  AdvancedSearchFilters,
  SearchSortBy,
  SearchSortOrder,
} from "./searchTypes"

type SearchTextFields = Pick<
  AdvancedSearchFilters,
  "q" | "title" | "description" | "characteristics" | "priceMin" | "priceMax"
>

function sanitizeTextValue(value: string | null): string {
  return value?.trim() ?? ""
}

function sanitizeNumberInput(value: string | null): string {
  const normalized = sanitizeTextValue(value)

  if (!normalized) {
    return ""
  }

  const parsedValue = Number(normalized)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return ""
  }

  return normalized
}

function parsePositiveInteger(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

function parseSortBy(value: string | null): SearchSortBy {
  if (value && SEARCH_ALLOWED_SORT_BY.includes(value as SearchSortBy)) {
    return value as SearchSortBy
  }

  return SEARCH_DEFAULT_SORT_BY
}

function parseSortOrder(value: string | null): SearchSortOrder {
  if (value && SEARCH_ALLOWED_SORT_ORDER.includes(value as SearchSortOrder)) {
    return value as SearchSortOrder
  }

  return SEARCH_DEFAULT_SORT_ORDER
}

function parseLegacySort(value: string | null): {
  sortBy: SearchSortBy
  sortOrder: SearchSortOrder
} {
  switch (value) {
    case "price_asc":
      return { sortBy: "price", sortOrder: "asc" }

    case "price_desc":
      return { sortBy: "price", sortOrder: "desc" }

    case "availability":
      return { sortBy: "availability", sortOrder: "desc" }

    default:
      return {
        sortBy: SEARCH_DEFAULT_SORT_BY,
        sortOrder: SEARCH_DEFAULT_SORT_ORDER,
      }
  }
}

function parseCategories(value: string | null): string[] {
  if (!value) {
    return []
  }

  const uniqueCategories = new Set(
    value
      .split(",")
      .map((categoryId) => categoryId.trim())
      .filter((categoryId) => categoryId.length > 0),
  )

  return Array.from(uniqueCategories)
}

function setIfNotEmpty(
  searchParams: URLSearchParams,
  key: string,
  value: string,
): void {
  const normalized = value.trim()

  if (normalized) {
    searchParams.set(key, normalized)
  }
}

export function getSearchTextFields(
  filters: AdvancedSearchFilters,
): SearchTextFields {
  return {
    q: filters.q,
    title: filters.title,
    description: filters.description,
    characteristics: filters.characteristics,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
  }
}

export function areSearchTextFieldsEqual(
  filters: AdvancedSearchFilters,
  textFields: SearchTextFields,
): boolean {
  const currentTextFields = getSearchTextFields(filters)

  return (
    currentTextFields.q === textFields.q &&
    currentTextFields.title === textFields.title &&
    currentTextFields.description === textFields.description &&
    currentTextFields.characteristics === textFields.characteristics &&
    currentTextFields.priceMin === textFields.priceMin &&
    currentTextFields.priceMax === textFields.priceMax
  )
}

export function parseSearchFilters(
  searchParams: URLSearchParams,
): AdvancedSearchFilters {
  const legacySort = parseLegacySort(searchParams.get("sort"))

  const sortBy = searchParams.has("sort_by")
    ? parseSortBy(searchParams.get("sort_by"))
    : legacySort.sortBy

  const sortOrder = searchParams.has("sort_order")
    ? parseSortOrder(searchParams.get("sort_order"))
    : legacySort.sortOrder

  return {
    q: sanitizeTextValue(searchParams.get("q")),
    title: sanitizeTextValue(searchParams.get("title")),
    description: sanitizeTextValue(searchParams.get("description")),
    characteristics:
      sanitizeTextValue(searchParams.get("characteristics")) ||
      sanitizeTextValue(searchParams.get("tech")),
    priceMin: sanitizeNumberInput(searchParams.get("price_min")),
    priceMax: sanitizeNumberInput(searchParams.get("price_max")),
    categories: parseCategories(searchParams.get("categories")),
    availableOnly: searchParams.get("available_only") === "true",
    sortBy,
    sortOrder,
    page: parsePositiveInteger(searchParams.get("page")),
  }
}

export function buildSearchParamsFromFilters(
  filters: AdvancedSearchFilters,
): URLSearchParams {
  const searchParams = new URLSearchParams()

  setIfNotEmpty(searchParams, "q", filters.q)
  setIfNotEmpty(searchParams, "title", filters.title)
  setIfNotEmpty(searchParams, "description", filters.description)
  setIfNotEmpty(searchParams, "characteristics", filters.characteristics)

  setIfNotEmpty(searchParams, "price_min", filters.priceMin)
  setIfNotEmpty(searchParams, "price_max", filters.priceMax)

  if (filters.categories.length > 0) {
    searchParams.set("categories", filters.categories.join(","))
  }

  if (filters.availableOnly) {
    searchParams.set("available_only", "true")
  }

  searchParams.set("sort_by", filters.sortBy)
  searchParams.set("sort_order", filters.sortOrder)

  if (filters.page > 1) {
    searchParams.set("page", String(filters.page))
  }

  return searchParams
}

export function buildSearchApiRequestUrl(
  filters: AdvancedSearchFilters,
): string {
  const searchParams = buildSearchParamsFromFilters(filters)
  searchParams.set("limit", String(SEARCH_RESULTS_PAGE_LIMIT))

  const queryString = searchParams.toString()

  if (!queryString) {
    return "/api/search"
  }

  return `/api/search?${queryString}`
}

export function hasActiveSearchCriteria(
  filters: AdvancedSearchFilters,
): boolean {
  return (
    filters.q.length > 0 ||
    filters.title.length > 0 ||
    filters.description.length > 0 ||
    filters.characteristics.length > 0 ||
    filters.priceMin.length > 0 ||
    filters.priceMax.length > 0 ||
    filters.categories.length > 0 ||
    filters.availableOnly
  )
}

export function getResetFilters(): AdvancedSearchFilters {
  return {
    ...SEARCH_DEFAULT_FILTERS,
    categories: [...SEARCH_DEFAULT_FILTERS.categories],
  }
}
