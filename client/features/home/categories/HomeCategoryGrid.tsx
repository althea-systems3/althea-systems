"use client"

import { useTranslations } from "next-intl"
import { HomeCategoryCard } from "./HomeCategoryCard"
import {
  HomeCategoryGridEmptyState,
  HomeCategoryGridErrorState,
  HomeCategoryGridFallbackDataState,
  HomeCategoryGridLoadingState,
} from "./HomeCategoryGridStates"
import { getHasNoHomeCategories } from "./categoryGridUtils"
import { useHomeCategoryGrid } from "./useHomeCategoryGrid"

export function HomeCategoryGrid() {
  const translateHomeCategoryGrid = useTranslations("HomeCategoryGrid")
  const {
    homeCategories,
    isHomeCategoryGridLoading,
    hasHomeCategoryGridError,
    isUsingFallbackHomeCategories,
  } = useHomeCategoryGrid()

  const hasNoHomeCategories = getHasNoHomeCategories(
    isHomeCategoryGridLoading,
    hasHomeCategoryGridError,
    homeCategories.length,
  )

  return (
    <section aria-labelledby="home-category-grid-title" className="space-y-4">
      <div>
        <h2
          id="home-category-grid-title"
          className="heading-font text-2xl tracking-tight text-brand-nav sm:text-3xl"
        >
          {translateHomeCategoryGrid("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
          {translateHomeCategoryGrid("description")}
        </p>
      </div>

      {isHomeCategoryGridLoading ? <HomeCategoryGridLoadingState /> : null}
      {hasHomeCategoryGridError ? <HomeCategoryGridErrorState /> : null}
      {hasNoHomeCategories ? <HomeCategoryGridEmptyState /> : null}

      {isUsingFallbackHomeCategories && !isHomeCategoryGridLoading ? (
        <HomeCategoryGridFallbackDataState />
      ) : null}

      {!isHomeCategoryGridLoading &&
      !hasHomeCategoryGridError &&
      homeCategories.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:gap-5 lg:grid-cols-4">
          {homeCategories.map((homeCategory) => (
            <HomeCategoryCard
              key={homeCategory.id}
              homeCategory={homeCategory}
            />
          ))}
        </ul>
      ) : null}
    </section>
  )
}
