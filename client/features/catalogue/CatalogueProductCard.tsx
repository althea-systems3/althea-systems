"use client"

import { useState } from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ImagePlaceholder } from "@/components/ui/image-placeholder"
import { cn } from "@/lib/utils"
import { CATALOGUE_PRODUCT_PRIORITY_CARD_COUNT } from "./catalogueConstants"
import type { CatalogueProduct } from "./catalogueTypes"
import {
  formatCatalogueProductPrice,
  getCatalogueProductPagePath,
} from "./catalogueUtils"

type CatalogueProductCardProps = {
  product: CatalogueProduct
  cardIndex: number
}

function CatalogueProductCardImage({
  product,
  shouldPrioritizeLoading,
}: {
  product: CatalogueProduct
  shouldPrioritizeLoading: boolean
}) {
  const t = useTranslations("CataloguePage")
  const [hasImageLoadFailed, setHasImageLoadFailed] = useState(false)

  const hasImage = Boolean(product.imageUrl) && !hasImageLoadFailed

  if (!hasImage) {
    return (
      <ImagePlaceholder
        label={t("products.missingImageLabel")}
        textClassName="text-xl sm:text-2xl"
      />
    )
  }

  return (
    <Image
      src={product.imageUrl as string}
      alt={t("products.productImageAlt", { productName: product.name })}
      fill
      priority={shouldPrioritizeLoading}
      loading={shouldPrioritizeLoading ? undefined : "lazy"}
      sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      className={cn(
        "object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105",
        !product.isAvailable && "grayscale",
      )}
      onError={() => setHasImageLoadFailed(true)}
    />
  )
}

function CatalogueProductAvailabilityBadge({
  isAvailable,
}: {
  isAvailable: boolean
}) {
  const t = useTranslations("CataloguePage")

  if (isAvailable) {
    return (
      <span className="inline-flex rounded-full bg-brand-success/15 px-2.5 py-1 text-xs font-semibold text-brand-success">
        {t("products.availabilityAvailable")}
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-brand-error/15 px-2.5 py-1 text-xs font-semibold text-brand-error">
      {t("products.availabilityOutOfStock")}
    </span>
  )
}

export function CatalogueProductCard({
  product,
  cardIndex,
}: CatalogueProductCardProps) {
  const locale = useLocale()
  const t = useTranslations("CataloguePage")

  const productPagePath = getCatalogueProductPagePath(product.slug)
  const hasPrice = typeof product.price === "number"
  const shouldPrioritizeLoading =
    cardIndex < CATALOGUE_PRODUCT_PRIORITY_CARD_COUNT

  return (
    <li>
      <Link
        href={productPagePath}
        className={cn(
          "group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-cta/50 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2",
          !product.isAvailable && "opacity-60",
        )}
        aria-label={t("products.productLinkLabel", {
          productName: product.name,
        })}
      >
        <article>
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            <CatalogueProductCardImage
              product={product}
              shouldPrioritizeLoading={shouldPrioritizeLoading}
            />
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
                  {formatCatalogueProductPrice(product.price as number, locale)}
                </p>
              ) : (
                <p className="text-sm text-slate-600 sm:text-base">
                  {t("products.priceUnavailable")}
                </p>
              )}

              <CatalogueProductAvailabilityBadge
                isAvailable={product.isAvailable}
              />
            </div>
          </div>
        </article>
      </Link>
    </li>
  )
}
