import { CATALOGUE_PRODUCT_PAGE_PATH_PREFIX } from "./catalogueConstants"

export function getCatalogueProductPagePath(productSlug: string): string {
  return `${CATALOGUE_PRODUCT_PAGE_PATH_PREFIX}/${productSlug}`
}

export function formatCatalogueProductPrice(
  price: number,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(price)
}

export function getCatalogueHasNoProducts(
  isLoading: boolean,
  hasError: boolean,
  productCount: number,
): boolean {
  return !isLoading && !hasError && productCount === 0
}
