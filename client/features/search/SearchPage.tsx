"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { CatalogueProductCard } from "@/features/catalogue/CatalogueProductCard"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import {
  SEARCH_ALLOWED_SORT_BY,
  SEARCH_ALLOWED_SORT_ORDER,
  SEARCH_PAGE_PATH,
  SEARCH_TEXT_DEBOUNCE_MS,
} from "./searchConstants"
import {
  SearchEmptyState,
  SearchErrorState,
  SearchLoadingState,
  SearchNoCriteriaState,
  SearchPartialDataNotice,
} from "./SearchPageStates"
import type {
  AdvancedSearchFilters,
  SearchSortBy,
  SearchSortOrder,
} from "./searchTypes"
import {
  areSearchTextFieldsEqual,
  buildSearchParamsFromFilters,
  getResetFilters,
  getSearchTextFields,
  hasActiveSearchCriteria,
  parseSearchFilters,
} from "./searchUtils"
import { useAdvancedSearch } from "./useAdvancedSearch"
import { useSearchFacets } from "./useSearchFacets"

type SearchTextFields = Pick<
  AdvancedSearchFilters,
  "q" | "title" | "description" | "characteristics" | "priceMin" | "priceMax"
>

type ActiveFilterChip = {
  id: string
  label: string
  kind:
    | "q"
    | "title"
    | "description"
    | "characteristics"
    | "priceMin"
    | "priceMax"
    | "category"
    | "availableOnly"
  value?: string
}

function useDebouncedValue<T>(value: T, delayInMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayInMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [value, delayInMs])

  return debouncedValue
}

function formatFacetPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(price)
}

export function SearchPage() {
  const t = useTranslations("SearchPage")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const searchParamsSnapshot = searchParams.toString()

  const filters = useMemo(() => {
    return parseSearchFilters(new URLSearchParams(searchParamsSnapshot))
  }, [searchParamsSnapshot])

  const [searchTextFields, setSearchTextFields] = useState<SearchTextFields>(
    () => {
      return getSearchTextFields(filters)
    },
  )

  useEffect(() => {
    setSearchTextFields(getSearchTextFields(filters))
  }, [filters])

  const debouncedSearchTextFields = useDebouncedValue(
    searchTextFields,
    SEARCH_TEXT_DEBOUNCE_MS,
  )

  const replaceFilters = useCallback(
    (nextFilters: AdvancedSearchFilters) => {
      const nextSearchParams = buildSearchParamsFromFilters(nextFilters)
      const queryString = nextSearchParams.toString()

      router.replace(
        queryString ? `${SEARCH_PAGE_PATH}?${queryString}` : SEARCH_PAGE_PATH,
      )
    },
    [router],
  )

  useEffect(() => {
    if (areSearchTextFieldsEqual(filters, debouncedSearchTextFields)) {
      return
    }

    replaceFilters({
      ...filters,
      ...debouncedSearchTextFields,
      page: 1,
    })
  }, [debouncedSearchTextFields, filters, replaceFilters])

  const {
    categories,
    priceRange,
    isSearchFacetsLoading,
    hasSearchFacetsError,
  } = useSearchFacets()

  const hasCriteria = hasActiveSearchCriteria(filters)

  const {
    products,
    pagination,
    isSearchLoading,
    isSearchRefreshing,
    hasSearchError,
    isPartialData,
  } = useAdvancedSearch(filters, hasCriteria)

  const totalResultCount = pagination?.total ?? products.length

  const liveAnnouncement = useMemo(() => {
    if (!hasCriteria) {
      return t("announcements.noCriteria")
    }

    if (isSearchLoading) {
      return t("announcements.loading")
    }

    if (hasSearchError) {
      return t("announcements.error")
    }

    if (totalResultCount === 0) {
      return t("announcements.empty")
    }

    return t("announcements.results", { count: totalResultCount })
  }, [hasCriteria, hasSearchError, isSearchLoading, t, totalResultCount])

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]))
  }, [categories])

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.q) {
      chips.push({
        id: "chip-q",
        label: t("activeFilters.quickText", { value: filters.q }),
        kind: "q",
      })
    }

    if (filters.title) {
      chips.push({
        id: "chip-title",
        label: t("activeFilters.titleFilter", { value: filters.title }),
        kind: "title",
      })
    }

    if (filters.description) {
      chips.push({
        id: "chip-description",
        label: t("activeFilters.description", { value: filters.description }),
        kind: "description",
      })
    }

    if (filters.characteristics) {
      chips.push({
        id: "chip-characteristics",
        label: t("activeFilters.characteristics", {
          value: filters.characteristics,
        }),
        kind: "characteristics",
      })
    }

    if (filters.priceMin) {
      chips.push({
        id: "chip-price-min",
        label: t("activeFilters.priceMin", { value: filters.priceMin }),
        kind: "priceMin",
      })
    }

    if (filters.priceMax) {
      chips.push({
        id: "chip-price-max",
        label: t("activeFilters.priceMax", { value: filters.priceMax }),
        kind: "priceMax",
      })
    }

    filters.categories.forEach((categoryId) => {
      chips.push({
        id: `chip-category-${categoryId}`,
        label: t("activeFilters.category", {
          categoryName: categoryNameById.get(categoryId) ?? categoryId,
        }),
        kind: "category",
        value: categoryId,
      })
    })

    if (filters.availableOnly) {
      chips.push({
        id: "chip-available-only",
        label: t("activeFilters.availableOnly"),
        kind: "availableOnly",
      })
    }

    return chips
  }, [
    categoryNameById,
    filters.availableOnly,
    filters.categories,
    filters.characteristics,
    filters.description,
    filters.priceMax,
    filters.priceMin,
    filters.q,
    filters.title,
    t,
  ])

  const updateFilters = useCallback(
    (
      partialFilters: Partial<AdvancedSearchFilters>,
      options?: { keepPage?: boolean },
    ) => {
      const keepPage = options?.keepPage ?? false

      replaceFilters({
        ...filters,
        ...partialFilters,
        page: keepPage
          ? (partialFilters.page ?? filters.page)
          : (partialFilters.page ?? 1),
      })
    },
    [filters, replaceFilters],
  )

  const handleRemoveChip = (chip: ActiveFilterChip) => {
    if (chip.kind === "category" && chip.value) {
      updateFilters({
        categories: filters.categories.filter(
          (categoryId) => categoryId !== chip.value,
        ),
      })
      return
    }

    if (chip.kind === "availableOnly") {
      updateFilters({ availableOnly: false })
      return
    }

    if (chip.kind === "q") {
      setSearchTextFields((currentTextFields) => ({
        ...currentTextFields,
        q: "",
      }))
      return
    }

    if (chip.kind === "title") {
      setSearchTextFields((currentTextFields) => ({
        ...currentTextFields,
        title: "",
      }))
      return
    }

    if (chip.kind === "description") {
      setSearchTextFields((currentTextFields) => ({
        ...currentTextFields,
        description: "",
      }))
      return
    }

    if (chip.kind === "characteristics") {
      setSearchTextFields((currentTextFields) => ({
        ...currentTextFields,
        characteristics: "",
      }))
      return
    }

    if (chip.kind === "priceMin") {
      setSearchTextFields((currentTextFields) => ({
        ...currentTextFields,
        priceMin: "",
      }))
      return
    }

    setSearchTextFields((currentTextFields) => ({
      ...currentTextFields,
      priceMax: "",
    }))
  }

  const handleResetFilters = () => {
    const resetFilters = getResetFilters()
    setSearchTextFields(getSearchTextFields(resetFilters))
    replaceFilters(resetFilters)
  }

  const handleTextFieldChange = (
    key: keyof SearchTextFields,
    value: string,
  ) => {
    setSearchTextFields((currentTextFields) => ({
      ...currentTextFields,
      [key]: value,
    }))
  }

  const handleCategoryToggle = (categoryId: string) => {
    const isCurrentlySelected = filters.categories.includes(categoryId)

    const nextCategories = isCurrentlySelected
      ? filters.categories.filter((id) => id !== categoryId)
      : [...filters.categories, categoryId]

    updateFilters({ categories: nextCategories })
  }

  const handleSortByChange = (sortBy: SearchSortBy) => {
    updateFilters({ sortBy })
  }

  const handleSortOrderChange = (sortOrder: SearchSortOrder) => {
    updateFilters({ sortOrder })
  }

  const handleAvailableOnlyChange = (isChecked: boolean) => {
    updateFilters({ availableOnly: isChecked })
  }

  const handleGoToPage = (nextPage: number) => {
    if (!pagination) {
      return
    }

    if (nextPage < 1 || nextPage > pagination.totalPages) {
      return
    }

    updateFilters({ page: nextPage }, { keepPage: true })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const hasAnyActiveFilter = activeFilterChips.length > 0

  const facetPriceRangeHint =
    priceRange &&
    Number.isFinite(priceRange.min) &&
    Number.isFinite(priceRange.max)
      ? t("filters.priceRangeHint", {
          min: formatFacetPrice(priceRange.min, locale),
          max: formatFacetPrice(priceRange.max, locale),
        })
      : null

  const renderFiltersContent = (idPrefix: string) => {
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <div>
            <label
              htmlFor={`${idPrefix}-q`}
              className="mb-1.5 block text-sm font-medium text-brand-nav"
            >
              {t("filters.quickTextLabel")}
            </label>
            <InputGroup>
              <InputGroupInput
                id={`${idPrefix}-q`}
                type="search"
                value={searchTextFields.q}
                onChange={(changeEvent) =>
                  handleTextFieldChange("q", changeEvent.target.value)
                }
                placeholder={t("filters.quickTextPlaceholder")}
                className="ps-9"
              />
              <InputGroupAddon align="inline-start" className="text-slate-500">
                <Search className="size-4" aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-title`}
              className="mb-1.5 block text-sm font-medium text-brand-nav"
            >
              {t("filters.titleLabel")}
            </label>
            <input
              id={`${idPrefix}-title`}
              type="text"
              value={searchTextFields.title}
              onChange={(changeEvent) =>
                handleTextFieldChange("title", changeEvent.target.value)
              }
              placeholder={t("filters.titlePlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-description`}
              className="mb-1.5 block text-sm font-medium text-brand-nav"
            >
              {t("filters.descriptionLabel")}
            </label>
            <input
              id={`${idPrefix}-description`}
              type="text"
              value={searchTextFields.description}
              onChange={(changeEvent) =>
                handleTextFieldChange("description", changeEvent.target.value)
              }
              placeholder={t("filters.descriptionPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-characteristics`}
              className="mb-1.5 block text-sm font-medium text-brand-nav"
            >
              {t("filters.characteristicsLabel")}
            </label>
            <input
              id={`${idPrefix}-characteristics`}
              type="text"
              value={searchTextFields.characteristics}
              onChange={(changeEvent) =>
                handleTextFieldChange(
                  "characteristics",
                  changeEvent.target.value,
                )
              }
              placeholder={t("filters.characteristicsPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-brand-nav">
            {t("filters.priceTitle")}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${idPrefix}-price-min`} className="sr-only">
                {t("filters.priceMinLabel")}
              </label>
              <input
                id={`${idPrefix}-price-min`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={searchTextFields.priceMin}
                onChange={(changeEvent) =>
                  handleTextFieldChange("priceMin", changeEvent.target.value)
                }
                placeholder={t("filters.priceMinPlaceholder")}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor={`${idPrefix}-price-max`} className="sr-only">
                {t("filters.priceMaxLabel")}
              </label>
              <input
                id={`${idPrefix}-price-max`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={searchTextFields.priceMax}
                onChange={(changeEvent) =>
                  handleTextFieldChange("priceMax", changeEvent.target.value)
                }
                placeholder={t("filters.priceMaxPlaceholder")}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500"
              />
            </div>
          </div>

          {facetPriceRangeHint ? (
            <p className="text-xs text-slate-600">{facetPriceRangeHint}</p>
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-brand-nav">
            {t("filters.categoriesTitle")}
          </legend>

          {isSearchFacetsLoading ? (
            <div
              className="space-y-2"
              aria-label={t("filters.categoriesLoadingLabel")}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={`category-filter-skeleton-${idPrefix}-${index}`}
                  className="h-5 w-full"
                />
              ))}
            </div>
          ) : null}

          {!isSearchFacetsLoading && hasSearchFacetsError ? (
            <p className="text-sm text-brand-error">
              {t("filters.categoriesError")}
            </p>
          ) : null}

          {!isSearchFacetsLoading &&
          !hasSearchFacetsError &&
          categories.length === 0 ? (
            <p className="text-sm text-slate-600">
              {t("filters.categoriesEmpty")}
            </p>
          ) : null}

          {!isSearchFacetsLoading && categories.length > 0 ? (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2">
              {categories.map((category) => {
                const fieldId = `${idPrefix}-category-${category.id}`
                const isChecked = filters.categories.includes(category.id)

                return (
                  <label
                    key={category.id}
                    htmlFor={fieldId}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      id={fieldId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-cta"
                    />
                    <span>{category.name}</span>
                  </label>
                )
              })}
            </div>
          ) : null}
        </fieldset>

        <div>
          <label
            htmlFor={`${idPrefix}-available-only`}
            className="flex items-center gap-2 text-sm font-medium text-brand-nav"
          >
            <input
              id={`${idPrefix}-available-only`}
              type="checkbox"
              checked={filters.availableOnly}
              onChange={(changeEvent) =>
                handleAvailableOnlyChange(changeEvent.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-brand-cta"
            />
            <span>{t("filters.availableOnlyLabel")}</span>
          </label>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <div>
            <label
              htmlFor={`${idPrefix}-sort-by`}
              className="mb-1.5 block text-sm font-medium text-brand-nav"
            >
              {t("sort.criteriaLabel")}
            </label>
            <select
              id={`${idPrefix}-sort-by`}
              value={filters.sortBy}
              onChange={(changeEvent) =>
                handleSortByChange(changeEvent.target.value as SearchSortBy)
              }
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
            >
              {SEARCH_ALLOWED_SORT_BY.map((sortByValue) => (
                <option key={sortByValue} value={sortByValue}>
                  {t(`sort.criteriaOptions.${sortByValue}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-sort-order`}
              className="mb-1.5 block text-sm font-medium text-brand-nav"
            >
              {t("sort.orderLabel")}
            </label>
            <select
              id={`${idPrefix}-sort-order`}
              value={filters.sortOrder}
              onChange={(changeEvent) =>
                handleSortOrderChange(
                  changeEvent.target.value as SearchSortOrder,
                )
              }
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700"
            >
              {SEARCH_ALLOWED_SORT_ORDER.map((sortOrderValue) => (
                <option key={sortOrderValue} value={sortOrderValue}>
                  {t(`sort.orderOptions.${sortOrderValue}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleResetFilters}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("filters.resetAll")}
        </Button>
      </div>
    )
  }

  const canGoToPreviousPage = Boolean(pagination && pagination.page > 1)
  const canGoToNextPage = Boolean(
    pagination &&
    pagination.totalPages > 0 &&
    pagination.page < pagination.totalPages,
  )

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <h1 className="heading-font text-2xl text-brand-nav sm:text-3xl md:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-3xl text-sm text-slate-700 sm:text-base">
          {t("description")}
        </p>
      </header>

      <p aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </p>

      <div className="md:hidden">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center border-brand-cta text-brand-nav"
          onClick={() =>
            setIsMobileFiltersOpen((currentValue) => !currentValue)
          }
          aria-expanded={isMobileFiltersOpen}
          aria-controls="mobile-search-filters"
        >
          <Filter className="size-4" aria-hidden="true" />
          {isMobileFiltersOpen
            ? t("filters.closeMobile")
            : t("filters.openMobile")}
        </Button>

        {isMobileFiltersOpen ? (
          <div
            id="mobile-search-filters"
            className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {renderFiltersContent("mobile")}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(250px,310px)_1fr] md:items-start lg:gap-8">
        <aside className="hidden md:block">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-brand-nav">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {t("filters.title")}
            </h2>
            {renderFiltersContent("desktop")}
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <h2 className="heading-font text-lg text-brand-nav sm:text-xl">
                {t("results.title")}
              </h2>
              <p className="text-sm text-slate-600">
                {t("results.count", { count: totalResultCount })}
              </p>
            </div>

            {isSearchRefreshing ? (
              <p className="text-sm text-brand-cta" aria-live="polite">
                {t("results.refreshing")}
              </p>
            ) : null}
          </div>

          {hasAnyActiveFilter ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-brand-nav">
                  {t("activeFilters.heading")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul
                  className="flex flex-wrap gap-2"
                  aria-label={t("activeFilters.heading")}
                >
                  {activeFilterChips.map((chip) => (
                    <li key={chip.id}>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border border-brand-cta/30",
                          "bg-brand-cta/10 px-3 py-1 text-xs font-medium text-brand-nav",
                        )}
                        onClick={() => handleRemoveChip(chip)}
                        aria-label={t("activeFilters.removeLabel", {
                          filterLabel: chip.label,
                        })}
                      >
                        <span>{chip.label}</span>
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {t("activeFilters.resetAll")}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {isPartialData ? <SearchPartialDataNotice /> : null}

          {!hasCriteria ? <SearchNoCriteriaState /> : null}

          {hasCriteria && isSearchLoading ? <SearchLoadingState /> : null}

          {hasCriteria && !isSearchLoading && hasSearchError ? (
            <SearchErrorState />
          ) : null}

          {hasCriteria &&
          !isSearchLoading &&
          !hasSearchError &&
          totalResultCount === 0 ? (
            <SearchEmptyState />
          ) : null}

          {hasCriteria &&
          !isSearchLoading &&
          !hasSearchError &&
          products.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product, index) => (
                <CatalogueProductCard
                  key={product.id}
                  cardIndex={index}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    imageUrl: product.imageUrl,
                    price: product.priceTtc,
                    isAvailable: product.isAvailable,
                  }}
                />
              ))}
            </ul>
          ) : null}

          {hasCriteria && pagination && pagination.totalPages > 1 ? (
            <nav
              aria-label={t("results.paginationLabel")}
              className="flex items-center justify-end gap-3"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => handleGoToPage(filters.page - 1)}
                disabled={!canGoToPreviousPage}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                {t("results.previousPage")}
              </Button>

              <p className="text-sm text-slate-700">
                {t("results.pageCounter", {
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                })}
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleGoToPage(filters.page + 1)}
                disabled={!canGoToNextPage}
              >
                {t("results.nextPage")}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  )
}
