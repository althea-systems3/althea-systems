"use client"

import { CategoryHero } from "./CategoryHero"
import { CatalogueProductGrid } from "./CatalogueProductGrid"
import { useCatalogueCategory } from "./useCatalogueCategory"
import { useCatalogueProducts } from "./useCatalogueProducts"

type CataloguePageProps = {
  slug: string
}

export function CataloguePage({ slug }: CataloguePageProps) {
  const { category, isCategoryLoading, hasCategoryError, isCategoryNotFound } =
    useCatalogueCategory(slug)

  const {
    products,
    isProductsLoading,
    hasProductsError,
    pagination,
    goToPage,
  } = useCatalogueProducts(slug)

  return (
    <div className="space-y-8 sm:space-y-10">
      <CategoryHero
        category={category}
        isLoading={isCategoryLoading}
        hasError={hasCategoryError}
        isNotFound={isCategoryNotFound}
      />

      {!isCategoryNotFound ? (
        <CatalogueProductGrid
          products={products}
          isLoading={isProductsLoading}
          hasError={hasProductsError}
          pagination={pagination}
          onPageChange={goToPage}
        />
      ) : null}
    </div>
  )
}
