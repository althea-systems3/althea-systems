"use client"

import { useState } from "react"
import Image from "next/image"
import { Minus, Plus, Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ImagePlaceholder } from "@/components/ui/image-placeholder"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { getProductPagePath } from "@/features/product/productUtils"
import { formatCartPrice } from "./cartUtils"
import type { CartLine } from "./cartTypes"

type CartLineItemProps = {
  line: CartLine
  isUpdating: boolean
  errorMessage: string | null
  onIncreaseQuantity: (lineId: string) => void
  onDecreaseQuantity: (lineId: string) => void
  onSubmitQuantity: (lineId: string, quantity: number) => void
  onRemoveLine: (lineId: string) => void
}

function CartLineImage({ line }: { line: CartLine }) {
  const t = useTranslations("CartPage")
  const [hasImageLoadFailed, setHasImageLoadFailed] = useState(false)

  const hasImage = Boolean(line.imageUrl) && !hasImageLoadFailed

  if (!hasImage) {
    return (
      <ImagePlaceholder
        label={t("line.missingImageLabel")}
        className="min-h-24 rounded-lg"
        iconClassName="size-5"
        textClassName="text-sm"
      />
    )
  }

  return (
    <Image
      src={line.imageUrl as string}
      alt={t("line.imageAlt", { productName: line.name })}
      fill
      sizes="(max-width: 640px) 100vw, 120px"
      className={cn(
        "object-cover transition-transform duration-300 group-hover:scale-105",
        !line.isAvailable && "grayscale",
      )}
      onError={() => setHasImageLoadFailed(true)}
    />
  )
}

function CartAvailabilityBadge({ line }: { line: CartLine }) {
  const t = useTranslations("CartPage")

  if (!line.isAvailable) {
    return (
      <span className="inline-flex rounded-full bg-brand-error/15 px-2.5 py-1 text-xs font-semibold text-brand-error">
        {t("line.statusOutOfStock")}
      </span>
    )
  }

  if (!line.isStockSufficient) {
    return (
      <span className="inline-flex rounded-full bg-brand-alert/15 px-2.5 py-1 text-xs font-semibold text-brand-nav">
        {t("line.statusStockConflict")}
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-brand-success/15 px-2.5 py-1 text-xs font-semibold text-brand-success">
      {t("line.statusAvailable")}
    </span>
  )
}

export function CartLineItem({
  line,
  isUpdating,
  errorMessage,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onSubmitQuantity,
  onRemoveLine,
}: CartLineItemProps) {
  const t = useTranslations("CartPage")
  const locale = useLocale()

  const [quantityInputValue, setQuantityInputValue] = useState(
    String(line.quantity),
  )

  const canIncreaseQuantity =
    line.isAvailable && line.quantity < Math.max(line.stockQuantity, 0)
  const canDecreaseQuantity = line.quantity > 0

  const handleCommitQuantityInput = () => {
    const parsedQuantity = Number.parseInt(quantityInputValue, 10)

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setQuantityInputValue(String(line.quantity))
      return
    }

    if (parsedQuantity === line.quantity) {
      return
    }

    onSubmitQuantity(line.id, parsedQuantity)
  }

  const lineProductPath = getProductPagePath(line.slug)

  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm transition-colors",
        !line.isAvailable || !line.isStockSufficient
          ? "border-brand-error/40"
          : "border-slate-200",
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-start">
        <div className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
          <CartLineImage line={line} />
          <div
            className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="space-y-4">
          <header className="space-y-2">
            <Link
              href={lineProductPath}
              className="heading-font text-lg leading-tight text-brand-nav hover:text-brand-cta"
            >
              {line.name}
            </Link>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <p className="font-semibold text-brand-nav">
                {t("line.unitPrice", {
                  price: formatCartPrice(line.priceTtc, locale),
                })}
              </p>

              <CartAvailabilityBadge line={line} />
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("line.quantityLabel")}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!canDecreaseQuantity || isUpdating}
                  aria-label={t("line.decreaseQuantity", {
                    productName: line.name,
                  })}
                  onClick={() => onDecreaseQuantity(line.id)}
                >
                  <Minus className="size-4" aria-hidden="true" />
                </Button>

                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={quantityInputValue}
                  disabled={isUpdating}
                  aria-label={t("line.quantityInputLabel", {
                    productName: line.name,
                  })}
                  onChange={(changeEvent) =>
                    setQuantityInputValue(changeEvent.target.value)
                  }
                  onBlur={handleCommitQuantityInput}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === "Enter") {
                      keyboardEvent.preventDefault()
                      handleCommitQuantityInput()
                    }

                    if (keyboardEvent.key === "Escape") {
                      setQuantityInputValue(String(line.quantity))
                    }
                  }}
                  className="h-9 w-20 rounded-md border border-border bg-white px-2 text-center text-sm text-slate-700"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!canIncreaseQuantity || isUpdating}
                  aria-label={t("line.increaseQuantity", {
                    productName: line.name,
                  })}
                  onClick={() => onIncreaseQuantity(line.id)}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="text-sm text-slate-600">
              {line.isAvailable && !line.isStockSufficient ? (
                <p className="text-brand-alert">
                  {t("line.stockConflictDescription", {
                    stock: line.stockQuantity,
                  })}
                </p>
              ) : null}

              {!line.isAvailable ? (
                <p className="text-brand-error">
                  {t("line.outOfStockDescription")}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="text-brand-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              {isUpdating ? (
                <p aria-live="polite" className="text-brand-cta">
                  {t("line.updatingLabel")}
                </p>
              ) : null}
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("line.subtotalLabel")}
              </p>
              <p className="text-base font-semibold text-brand-nav sm:text-lg">
                {formatCartPrice(line.subtotalTtc, locale)}
              </p>

              <Button
                type="button"
                variant="ghost"
                className="mt-2 text-brand-error hover:bg-red-50 hover:text-brand-error"
                disabled={isUpdating}
                aria-label={t("line.removeLine", { productName: line.name })}
                onClick={() => onRemoveLine(line.id)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t("line.removeAction")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
