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
        <ul
          className="
            -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2
            [scrollbar-width:thin]
            md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0 md:pb-0 md:gap-5
            md:grid-cols-3 lg:grid-cols-4
            [&>li]:w-[80%] [&>li]:shrink-0 [&>li]:snap-start
            md:[&>li]:w-auto md:[&>li]:shrink
          "
        >
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
