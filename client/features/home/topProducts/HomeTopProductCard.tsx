"use client"

import { useState } from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { HOME_TOP_PRODUCTS_PRIORITY_CARD_COUNT } from "./topProductsConstants"
import type { HomeTopProduct } from "./topProductsTypes"
import {
  formatTopProductPrice,
  getTopProductPagePath,
} from "./topProductsUtils"

type HomeTopProductCardProps = {
  homeTopProduct: HomeTopProduct
  cardIndex: number
}

function HomeTopProductCardImage({
  homeTopProduct,
  shouldPrioritizeLoading,
}: {
  homeTopProduct: HomeTopProduct
  shouldPrioritizeLoading: boolean
}) {
  const translateHomeTopProductsGrid = useTranslations("HomeTopProductsGrid")
  const [hasImageLoadFailed, setHasImageLoadFailed] = useState(false)

  const hasProductImage =
    Boolean(homeTopProduct.imageUrl) && !hasImageLoadFailed

  if (!hasProductImage) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-nav/90 to-brand-cta/80"
        aria-hidden="true"
      >
        <span className="heading-font px-4 text-center text-xl text-white sm:text-2xl">
          {translateHomeTopProductsGrid("missingImageLabel")}
        </span>
      </div>
    )
  }

  return (
    <Image
      src={homeTopProduct.imageUrl as string}
      alt={translateHomeTopProductsGrid("productImageAlt", {
        productName: homeTopProduct.name,
      })}
      fill
      priority={shouldPrioritizeLoading}
      loading={shouldPrioritizeLoading ? undefined : "lazy"}
      sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      className="object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
      onError={() => {
        setHasImageLoadFailed(true)
      }}
    />
  )
}

function HomeTopProductAvailabilityBadge({
  isAvailable,
}: Pick<HomeTopProduct, "isAvailable">) {
  const translateHomeTopProductsGrid = useTranslations("HomeTopProductsGrid")

  if (isAvailable) {
    return (
      <span className="inline-flex rounded-full bg-brand-success/15 px-2.5 py-1 text-xs font-semibold text-brand-success">
        {translateHomeTopProductsGrid("availabilityAvailable")}
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-brand-error/15 px-2.5 py-1 text-xs font-semibold text-brand-error">
      {translateHomeTopProductsGrid("availabilityOutOfStock")}
    </span>
  )
}

export function HomeTopProductCard({
  homeTopProduct,
  cardIndex,
}: HomeTopProductCardProps) {
  const locale = useLocale()
  const translateHomeTopProductsGrid = useTranslations("HomeTopProductsGrid")

  const topProductPagePath = getTopProductPagePath(homeTopProduct.slug)
  const hasPrice = typeof homeTopProduct.price === "number"
  const shouldPrioritizeLoading =
    cardIndex < HOME_TOP_PRODUCTS_PRIORITY_CARD_COUNT

  return (
    <li>
      <Link
        href={topProductPagePath}
        className={cn(
          "group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-cta/50 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2",
        )}
        aria-label={translateHomeTopProductsGrid("productLinkLabel", {
          productName: homeTopProduct.name,
        })}
      >
        <article>
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            <HomeTopProductCardImage
              homeTopProduct={homeTopProduct}
              shouldPrioritizeLoading={shouldPrioritizeLoading}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent"
              aria-hidden="true"
            />
          </div>

          <div className="space-y-3 p-4">
            <h3 className="heading-font min-h-[3rem] break-words text-base leading-snug text-brand-nav sm:text-lg">
              {homeTopProduct.name}
            </h3>

            <div className="flex items-center justify-between gap-3">
              {hasPrice ? (
                <p className="text-sm font-semibold text-brand-nav sm:text-base">
                  {formatTopProductPrice(
                    homeTopProduct.price as number,
                    locale,
                  )}
                </p>
              ) : (
                <p className="text-sm text-slate-600 sm:text-base">
                  {translateHomeTopProductsGrid("priceUnavailable")}
                </p>
              )}
              <HomeTopProductAvailabilityBadge
                isAvailable={homeTopProduct.isAvailable}
              />
            </div>
          </div>
        </article>
      </Link>
    </li>
  )
}
