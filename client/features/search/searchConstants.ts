import type {
  AdvancedSearchFilters,
  SearchSortBy,
  SearchSortOrder,
} from "./searchTypes"

export const SEARCH_PAGE_PATH = "/recherche"
export const SEARCH_RESULTS_PAGE_LIMIT = 12
export const SEARCH_TEXT_DEBOUNCE_MS = 280

export const SEARCH_ALLOWED_SORT_BY: SearchSortBy[] = [
  "price",
  "newness",
  "availability",
]

export const SEARCH_ALLOWED_SORT_ORDER: SearchSortOrder[] = ["asc", "desc"]

export const SEARCH_DEFAULT_SORT_BY: SearchSortBy = "newness"
export const SEARCH_DEFAULT_SORT_ORDER: SearchSortOrder = "desc"

export const SEARCH_DEFAULT_FILTERS: AdvancedSearchFilters = {
  q: "",
  title: "",
  description: "",
  characteristics: "",
  priceMin: "",
  priceMax: "",
  categories: [],
  availableOnly: false,
  sortBy: SEARCH_DEFAULT_SORT_BY,
  sortOrder: SEARCH_DEFAULT_SORT_ORDER,
  page: 1,
}
