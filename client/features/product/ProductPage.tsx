"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AddToCartApiErrorResponse } from "./productTypes"
import { ProductImageCarousel } from "./ProductImageCarousel"
import {
  ProductPageErrorState,
  ProductPageLoadingState,
  ProductPageNotFoundState,
} from "./ProductPageStates"
import { SimilarProductsSection } from "./SimilarProductsSection"
import {
  formatProductPrice,
  normalizeProductCharacteristics,
  syncCartCountStorage,
} from "./productUtils"
import { useProductDetail } from "./useProductDetail"
import { useSimilarProducts } from "./useSimilarProducts"

type ProductPageProps = {
  slug: string
}

type CartFeedback = {
  type: "success" | "error"
  message: string
}

export function ProductPage({ slug }: ProductPageProps) {
  const locale = useLocale()
  const t = useTranslations("ProductPage")

  const { product, isProductLoading, hasProductError, isProductNotFound } =
    useProductDetail(slug)
  const { similarProducts, isSimilarProductsLoading, hasSimilarProductsError } =
    useSimilarProducts(slug)

  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [cartFeedback, setCartFeedback] = useState<CartFeedback | null>(null)

  const characteristicRows = useMemo(() => {
    return normalizeProductCharacteristics(product?.characteristics ?? null)
  }, [product?.characteristics])

  const handleAddToCart = async () => {
    if (!product || !product.isAvailable || isAddingToCart) {
      return
    }

    setIsAddingToCart(true)
    setCartFeedback(null)

    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_produit: product.id,
          quantite: 1,
        }),
      })

      const body = (await response
        .json()
        .catch(() => null)) as AddToCartApiErrorResponse | null

      if (!response.ok) {
        const reason = typeof body?.error === "string" ? body.error : null

        setCartFeedback({
          type: "error",
          message: reason
            ? t("cta.errorWithReason", { reason })
            : t("cta.error"),
        })

        return
      }

      await syncCartCountStorage()

      setCartFeedback({
        type: "success",
        message: t("cta.success"),
      })
    } catch (error) {
      console.error("Failed to add product to cart", {
        productId: product.id,
        error,
      })

      setCartFeedback({
        type: "error",
        message: t("cta.error"),
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  if (isProductLoading) {
    return <ProductPageLoadingState />
  }

  if (isProductNotFound) {
    return <ProductPageNotFoundState />
  }

  if (hasProductError || !product) {
    return <ProductPageErrorState />
  }

  const hasPrice = typeof product.priceTtc === "number"
  const isOutOfStock = !product.isAvailable

  return (
    <div className="space-y-10 sm:space-y-12">
      <article className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-8">
        <ProductImageCarousel
          images={product.images}
          productName={product.name}
        />

        <div className="space-y-6">
          <header className="space-y-4">
            <h1 className="heading-font text-2xl leading-tight text-brand-nav sm:text-3xl md:text-4xl">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              {hasPrice ? (
                <p className="text-xl font-semibold text-brand-nav sm:text-2xl">
                  {formatProductPrice(product.priceTtc as number, locale)}
                </p>
              ) : (
                <p className="text-base text-slate-600">
                  {t("priceUnavailable")}
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
                  ? t("availabilityAvailable")
                  : t("availabilityOutOfStock")}
              </span>
            </div>

            <p className="text-sm text-slate-600 sm:text-base">
              {t("stockLabel", { stock: product.stockQuantity })}
            </p>
          </header>

          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            {product.description ?? t("descriptionFallback")}
          </p>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Button
              type="button"
              className={cn(
                "w-full bg-brand-cta text-white hover:bg-brand-cta/90",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAddingToCart}
              aria-disabled={isOutOfStock || isAddingToCart}
            >
              {isOutOfStock
                ? t("cta.outOfStock")
                : isAddingToCart
                  ? t("cta.adding")
                  : t("cta.addToCart")}
            </Button>

            {cartFeedback ? (
              <p
                className={cn(
                  "text-sm",
                  cartFeedback.type === "success"
                    ? "text-brand-success"
                    : "text-brand-error",
                )}
                aria-live="polite"
              >
                {cartFeedback.message}
              </p>
            ) : (
              <p className="sr-only" aria-live="polite" />
            )}
          </div>

          <section
            aria-labelledby="product-characteristics-title"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2
              id="product-characteristics-title"
              className="heading-font text-lg text-brand-nav sm:text-xl"
            >
              {t("characteristics.title")}
            </h2>

            {characteristicRows.length > 0 ? (
              <dl className="mt-3 divide-y divide-slate-100">
                {characteristicRows.map((row) => (
                  <div
                    key={`${row.key}-${row.value}`}
                    className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(0,170px)_1fr] sm:gap-4"
                  >
                    <dt className="text-sm font-medium text-brand-nav">
                      {row.key}
                    </dt>
                    <dd className="break-words text-sm text-slate-700">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                {t("characteristics.empty")}
              </p>
            )}
          </section>
        </div>
      </article>

      <SimilarProductsSection
        products={similarProducts}
        isLoading={isSimilarProductsLoading}
        hasError={hasSimilarProductsError}
      />
    </div>
  )
}
