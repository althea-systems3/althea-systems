import { TOP_PRODUCT_CATALOG_PATH_PREFIX } from "./topProductsConstants"

export function getTopProductPagePath(productSlug: string): string {
  return `${TOP_PRODUCT_CATALOG_PATH_PREFIX}/${productSlug}`
}

export function getHasNoHomeTopProducts(
  isHomeTopProductsGridLoading: boolean,
  hasHomeTopProductsGridError: boolean,
  homeTopProductCount: number,
): boolean {
  return (
    !isHomeTopProductsGridLoading &&
    !hasHomeTopProductsGridError &&
    homeTopProductCount === 0
  )
}

export function formatTopProductPrice(
  productPrice: number,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(productPrice)
}
