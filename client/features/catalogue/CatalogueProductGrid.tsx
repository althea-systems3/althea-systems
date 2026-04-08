"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { CatalogueProductCard } from "./CatalogueProductCard"
import {
  CatalogueProductsEmptyState,
  CatalogueProductsErrorState,
  CatalogueProductsLoadingState,
} from "./CatalogueProductGridStates"
import type {
  CatalogueProduct,
  CatalogueProductsPagination,
} from "./catalogueTypes"
import { getCatalogueHasNoProducts } from "./catalogueUtils"

type CataloguePaginationControlsProps = {
  pagination: CatalogueProductsPagination
  onPageChange: (page: number) => void
}

function CataloguePaginationControls({
  pagination,
  onPageChange,
}: CataloguePaginationControlsProps) {
  const t = useTranslations("CataloguePage")
  const { page, totalPages, total } = pagination

  if (totalPages <= 1) return null

  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages

  return (
    <nav
      aria-label={t("products.paginationLabel")}
      className="mt-8 flex items-center justify-center gap-3"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={isFirstPage}
        aria-label={t("products.previousPage")}
        className={cn(
          "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-brand-nav shadow-sm",
          "transition-colors hover:border-brand-cta/50 hover:bg-slate-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        {t("products.previous")}
      </button>

      <p
        className="text-sm text-slate-600"
        aria-live="polite"
        aria-atomic="true"
      >
        {t("products.pageCounter", { page, totalPages, total })}
      </p>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={isLastPage}
        aria-label={t("products.nextPage")}
        className={cn(
          "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-brand-nav shadow-sm",
          "transition-colors hover:border-brand-cta/50 hover:bg-slate-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        {t("products.next")}
      </button>
    </nav>
  )
}

type CatalogueProductGridProps = {
  products: CatalogueProduct[]
  isLoading: boolean
  hasError: boolean
  pagination: CatalogueProductsPagination
  onPageChange: (page: number) => void
}

export function CatalogueProductGrid({
  products,
  isLoading,
  hasError,
  pagination,
  onPageChange,
}: CatalogueProductGridProps) {
  const t = useTranslations("CataloguePage")

  const hasNoProducts = getCatalogueHasNoProducts(
    isLoading,
    hasError,
    products.length,
  )

  return (
    <section aria-labelledby="catalogue-products-title" className="space-y-4">
      <h2
        id="catalogue-products-title"
        className="heading-font text-xl tracking-tight text-brand-nav sm:text-2xl"
      >
        {t("products.sectionTitle")}
      </h2>

      {isLoading ? <CatalogueProductsLoadingState /> : null}
      {hasError ? <CatalogueProductsErrorState /> : null}
      {hasNoProducts ? <CatalogueProductsEmptyState /> : null}

      {!isLoading && !hasError && products.length > 0 ? (
        <>
          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4"
            aria-label={t("products.gridLabel")}
          >
            {products.map((product, index) => (
              <CatalogueProductCard
                key={product.id}
                product={product}
                cardIndex={index}
              />
            ))}
          </ul>

          <CataloguePaginationControls
            pagination={pagination}
            onPageChange={onPageChange}
          />
        </>
      ) : null}
    </section>
  )
}
