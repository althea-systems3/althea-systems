"use client"

import { useTranslations } from "next-intl"
import { HomeTopProductCard } from "./HomeTopProductCard"
import {
  HomeTopProductsGridEmptyState,
  HomeTopProductsGridErrorState,
  HomeTopProductsGridFallbackDataState,
  HomeTopProductsGridLoadingState,
} from "./HomeTopProductsGridStates"
import { getHasNoHomeTopProducts } from "./topProductsUtils"
import { useHomeTopProductsGrid } from "./useHomeTopProductsGrid"

export function HomeTopProductsGrid() {
  const translateHomeTopProductsGrid = useTranslations("HomeTopProductsGrid")
  const {
    homeTopProducts,
    isHomeTopProductsGridLoading,
    hasHomeTopProductsGridError,
    isUsingFallbackHomeTopProducts,
  } = useHomeTopProductsGrid()

  const hasNoHomeTopProducts = getHasNoHomeTopProducts(
    isHomeTopProductsGridLoading,
    hasHomeTopProductsGridError,
    homeTopProducts.length,
  )

  return (
    <section
      aria-labelledby="home-top-products-grid-title"
      className="space-y-4"
    >
      <div>
        <h2
          id="home-top-products-grid-title"
          className="heading-font text-2xl tracking-tight text-brand-nav sm:text-3xl"
        >
          {translateHomeTopProductsGrid("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
          {translateHomeTopProductsGrid("description")}
        </p>
      </div>

      {isHomeTopProductsGridLoading ? (
        <HomeTopProductsGridLoadingState />
      ) : null}
      {hasHomeTopProductsGridError ? <HomeTopProductsGridErrorState /> : null}
      {hasNoHomeTopProducts ? <HomeTopProductsGridEmptyState /> : null}

      {isUsingFallbackHomeTopProducts && !isHomeTopProductsGridLoading ? (
        <HomeTopProductsGridFallbackDataState />
      ) : null}

      {!isHomeTopProductsGridLoading &&
      !hasHomeTopProductsGridError &&
      homeTopProducts.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {homeTopProducts.map((homeTopProduct, cardIndex) => (
            <HomeTopProductCard
              key={homeTopProduct.id}
              homeTopProduct={homeTopProduct}
              cardIndex={cardIndex}
            />
          ))}
        </ul>
      ) : null}
    </section>
  )
}
