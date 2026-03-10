import { CATEGORY_CATALOG_PATH_PREFIX } from "./categoryGridConstants"

export function getCategoryPagePath(categorySlug: string): string {
  return `${CATEGORY_CATALOG_PATH_PREFIX}/${categorySlug}`
}

export function getHasNoHomeCategories(
  isHomeCategoryGridLoading: boolean,
  hasHomeCategoryGridError: boolean,
  homeCategoryCount: number,
): boolean {
  return (
    !isHomeCategoryGridLoading &&
    !hasHomeCategoryGridError &&
    homeCategoryCount === 0
  )
}
