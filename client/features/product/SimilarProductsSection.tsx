"use client"

import { useState } from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImagePlaceholder } from "@/components/ui/image-placeholder"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type { SimilarProduct } from "./productTypes"
import { formatProductPrice, getProductPagePath } from "./productUtils"

type SimilarProductsSectionProps = {
  products: SimilarProduct[]
  isLoading: boolean
  hasError: boolean
}

function SimilarProductCard({ product }: { product: SimilarProduct }) {
  const locale = useLocale()
  const t = useTranslations("ProductPage")
  const [hasImageLoadFailed, setHasImageLoadFailed] = useState(false)

  const hasImage = Boolean(product.imageUrl) && !hasImageLoadFailed
  const hasPrice = typeof product.priceTtc === "number"

  return (
    <li>
      <Link
        href={getProductPagePath(product.slug)}
        className={cn(
          "group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-cta/50 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2",
          !product.isAvailable && "opacity-60",
        )}
        aria-label={t("similar.productLinkLabel", {
          productName: product.name,
        })}
      >
        <article>
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            {hasImage ? (
              <Image
                src={product.imageUrl as string}
                alt={t("similar.productImageAlt", {
                  productName: product.name,
                })}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className={cn(
                  "object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105",
                  !product.isAvailable && "grayscale",
                )}
                onError={() => setHasImageLoadFailed(true)}
              />
            ) : (
              <ImagePlaceholder
                label={t("similar.missingImageLabel")}
                textClassName="text-lg"
              />
            )}

            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent"
              aria-hidden="true"
            />
          </div>

          <div className="space-y-3 p-4">
            <h3 className="heading-font min-h-[3rem] break-words text-base leading-snug text-brand-nav sm:text-lg">
              {product.name}
            </h3>

            <div className="flex items-center justify-between gap-3">
              {hasPrice ? (
                <p className="text-sm font-semibold text-brand-nav sm:text-base">
                  {formatProductPrice(product.priceTtc as number, locale)}
                </p>
              ) : (
                <p className="text-sm text-slate-600 sm:text-base">
                  {t("similar.priceUnavailable")}
                </p>
              )}

              <span
                className={
                  product.isAvailable
                    ? "inline-flex rounded-full bg-brand-success/15 px-2.5 py-1 text-xs font-semibold text-brand-success"
                    : "inline-flex rounded-full bg-brand-error/15 px-2.5 py-1 text-xs font-semibold text-brand-error"
                }
              >
                {product.isAvailable
                  ? t("similar.availabilityAvailable")
                  : t("similar.availabilityOutOfStock")}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </li>
  )
}

function SimilarProductsLoadingState() {
  const t = useTranslations("ProductPage")

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-live="polite"
      aria-label={t("similar.loadingLabel")}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card
          key={`similar-product-skeleton-${index}`}
          className="overflow-hidden"
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SimilarProductsErrorState() {
  const t = useTranslations("ProductPage")

  return (
    <Card
      className="border-dashed border-red-200 bg-red-50/50"
      aria-live="polite"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("similar.errorTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {t("similar.errorDescription")}
      </CardContent>
    </Card>
  )
}

function SimilarProductsEmptyState() {
  const t = useTranslations("ProductPage")

  return (
    <Card
      className="border-dashed border-slate-300 bg-white"
      aria-live="polite"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          {t("similar.emptyTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700 sm:text-base">
        {t("similar.emptyDescription")}
      </CardContent>
    </Card>
  )
}

export function SimilarProductsSection({
  products,
  isLoading,
  hasError,
}: SimilarProductsSectionProps) {
  const t = useTranslations("ProductPage")

  const visibleProducts = products.slice(0, 6)

  return (
    <section aria-labelledby="similar-products-title" className="space-y-4">
      <div>
        <h2
          id="similar-products-title"
          className="heading-font text-xl tracking-tight text-brand-nav sm:text-2xl"
        >
          {t("similar.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
          {t("similar.description")}
        </p>
      </div>

      {isLoading ? <SimilarProductsLoadingState /> : null}
      {hasError ? <SimilarProductsErrorState /> : null}
      {!isLoading && !hasError && visibleProducts.length === 0 ? (
        <SimilarProductsEmptyState />
      ) : null}

      {!isLoading && !hasError && visibleProducts.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <SimilarProductCard key={product.id} product={product} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}
