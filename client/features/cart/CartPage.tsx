"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { CART_CHECKOUT_PATH } from "./cartConstants"
import { CartLineItem } from "./CartLineItem"
import {
  CartPageEmptyState,
  CartPageErrorState,
  CartPageLoadingState,
} from "./CartPageStates"
import {
  computeCartTotalsFromLines,
  extractCartLineErrorInfo,
  formatCartPrice,
  syncCartLayoutState,
} from "./cartUtils"
import { useCartData } from "./useCartData"
import type { CartLineMutationState } from "./cartTypes"

type CartFeedback = {
  type: "success" | "error"
  message: string
}

function CartSummary({
  totalItems,
  totalTtc,
  isCheckoutDisabled,
  checkoutDisabledReason,
}: {
  totalItems: number
  totalTtc: number
  isCheckoutDisabled: boolean
  checkoutDisabledReason: string | null
}) {
  const t = useTranslations("CartPage")
  const locale = useLocale()

  return (
    <Card className="border-slate-200 bg-white shadow-sm lg:sticky lg:top-24">
      <CardHeader className="pb-3">
        <CardTitle className="heading-font text-xl text-brand-nav">
          {t("summary.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="space-y-3 text-sm sm:text-base">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-600">{t("summary.totalItems")}</dt>
            <dd className="font-semibold text-brand-nav">
              {t("summary.totalItemsValue", { count: totalItems })}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <dt className="heading-font text-base text-brand-nav sm:text-lg">
              {t("summary.totalTtc")}
            </dt>
            <dd className="heading-font text-lg text-brand-nav sm:text-xl">
              {formatCartPrice(totalTtc, locale)}
            </dd>
          </div>
        </dl>

        {isCheckoutDisabled ? (
          <Button
            type="button"
            className="w-full bg-brand-cta text-white"
            disabled
          >
            {t("summary.checkoutAction")}
          </Button>
        ) : (
          <Button
            asChild
            className="w-full bg-brand-cta text-white hover:bg-brand-cta/90"
          >
            <Link href={CART_CHECKOUT_PATH}>{t("summary.checkoutAction")}</Link>
          </Button>
        )}

        {checkoutDisabledReason ? (
          <p className="text-sm text-brand-error" role="alert">
            {checkoutDisabledReason}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function CartPage() {
  const t = useTranslations("CartPage")

  const {
    cart,
    setCart,
    isCartLoading,
    isCartRefreshing,
    hasCartError,
    cartErrorCode,
    reloadCart,
  } = useCartData()

  const [lineMutationStateById, setLineMutationStateById] = useState<
    Record<string, CartLineMutationState>
  >({})
  const [feedback, setFeedback] = useState<CartFeedback | null>(null)

  const setLineMutationState = (
    lineId: string,
    nextState: Partial<CartLineMutationState>,
  ) => {
    setLineMutationStateById((currentState) => ({
      ...currentState,
      [lineId]: {
        isUpdating:
          nextState.isUpdating ?? currentState[lineId]?.isUpdating ?? false,
        errorMessage:
          nextState.errorMessage ?? currentState[lineId]?.errorMessage ?? null,
      },
    }))
  }

  const getLineMutationState = (lineId: string): CartLineMutationState => {
    return (
      lineMutationStateById[lineId] ?? {
        isUpdating: false,
        errorMessage: null,
      }
    )
  }

  const handleMutateLineQuantity = async (lineId: string, quantity: number) => {
    const targetLine = cart.lines.find((line) => line.id === lineId)

    if (!targetLine) {
      return
    }

    const safeQuantity = Math.max(0, Math.floor(quantity))

    if (safeQuantity === targetLine.quantity) {
      return
    }

    const previousCart = cart

    const optimisticLines =
      safeQuantity === 0
        ? cart.lines.filter((line) => line.id !== lineId)
        : cart.lines.map((line) => {
            if (line.id !== lineId) {
              return line
            }

            return {
              ...line,
              quantity: safeQuantity,
              subtotalTtc: Math.round(line.priceTtc * safeQuantity * 100) / 100,
              isStockSufficient: safeQuantity <= line.stockQuantity,
            }
          })

    const optimisticTotals = computeCartTotalsFromLines(optimisticLines)

    setCart({
      ...cart,
      lines: optimisticLines,
      totalItems: optimisticTotals.totalItems,
      totalTtc: optimisticTotals.totalTtc,
    })
    syncCartLayoutState(optimisticTotals.totalItems, optimisticTotals.totalTtc)

    setLineMutationState(lineId, {
      isUpdating: true,
      errorMessage: null,
    })
    setFeedback(null)

    try {
      const response = await fetch(`/api/cart/items/${lineId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantite: safeQuantity }),
      })

      const errorPayload = await response.json().catch(() => null)

      if (!response.ok) {
        const errorInfo = extractCartLineErrorInfo(errorPayload)

        const errorMessage =
          errorInfo.availableStock !== null
            ? t("errors.stockInsufficient", {
                availableStock: errorInfo.availableStock,
              })
            : (errorInfo.message ?? t("errors.updateLineFallback"))

        throw new Error(errorMessage)
      }

      const refreshedCart = await reloadCart({ silent: true })

      if (!refreshedCart) {
        setFeedback({
          type: "error",
          message: t("errors.refreshFallback"),
        })
      } else {
        setFeedback({
          type: "success",
          message:
            safeQuantity === 0
              ? t("feedback.lineRemoved")
              : t("feedback.quantityUpdated"),
        })
      }

      setLineMutationState(lineId, {
        isUpdating: false,
        errorMessage: null,
      })
    } catch (error) {
      setCart(previousCart)
      syncCartLayoutState(previousCart.totalItems, previousCart.totalTtc)

      const errorMessage =
        error instanceof Error ? error.message : t("errors.updateLineFallback")

      setLineMutationState(lineId, {
        isUpdating: false,
        errorMessage,
      })

      setFeedback({
        type: "error",
        message: errorMessage,
      })
    }
  }

  const handleRemoveLine = async (lineId: string) => {
    await handleMutateLineQuantity(lineId, 0)
  }

  const handleIncreaseQuantity = (lineId: string) => {
    const line = cart.lines.find((cartLine) => cartLine.id === lineId)

    if (!line) {
      return
    }

    void handleMutateLineQuantity(lineId, line.quantity + 1)
  }

  const handleDecreaseQuantity = (lineId: string) => {
    const line = cart.lines.find((cartLine) => cartLine.id === lineId)

    if (!line) {
      return
    }

    void handleMutateLineQuantity(lineId, line.quantity - 1)
  }

  const hasStockConflict = useMemo(() => {
    return cart.lines.some(
      (line) => !line.isAvailable || !line.isStockSufficient,
    )
  }, [cart.lines])

  const isAnyLineUpdating = useMemo(() => {
    return Object.values(lineMutationStateById).some(
      (lineState) => lineState.isUpdating,
    )
  }, [lineMutationStateById])

  const isCheckoutDisabled =
    cart.lines.length === 0 || hasStockConflict || isAnyLineUpdating

  const checkoutDisabledReason = hasStockConflict
    ? t("summary.checkoutBlockedStock")
    : isAnyLineUpdating
      ? t("summary.checkoutBlockedUpdating")
      : null

  if (isCartLoading) {
    return <CartPageLoadingState />
  }

  if (hasCartError) {
    return (
      <CartPageErrorState
        errorCode={cartErrorCode}
        onRetry={() => reloadCart()}
      />
    )
  }

  if (cart.lines.length === 0) {
    return <CartPageEmptyState />
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="heading-font text-2xl text-brand-nav sm:text-3xl md:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-3xl text-sm text-slate-700 sm:text-base">
          {t("description")}
        </p>
      </header>

      {isCartRefreshing ? (
        <div
          className="inline-flex items-center gap-2 rounded-full border border-brand-cta/30 bg-brand-cta/10 px-3 py-1 text-sm text-brand-nav"
          aria-live="polite"
        >
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          {t("feedback.refreshing")}
        </div>
      ) : null}

      {feedback ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            feedback.type === "success"
              ? "border-brand-success/40 bg-brand-success/10 text-brand-nav"
              : "border-brand-error/40 bg-red-50 text-brand-error",
          )}
          aria-live="polite"
        >
          {feedback.type === "error" ? (
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : null}
          <p>{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
        <section aria-label={t("line.sectionLabel")} className="space-y-4">
          {cart.lines.map((line) => {
            const lineMutationState = getLineMutationState(line.id)

            return (
              <CartLineItem
                key={`${line.id}-${line.quantity}-${line.stockQuantity}`}
                line={line}
                isUpdating={lineMutationState.isUpdating}
                errorMessage={lineMutationState.errorMessage}
                onIncreaseQuantity={handleIncreaseQuantity}
                onDecreaseQuantity={handleDecreaseQuantity}
                onSubmitQuantity={(lineId, quantity) =>
                  void handleMutateLineQuantity(lineId, quantity)
                }
                onRemoveLine={(lineId) => void handleRemoveLine(lineId)}
              />
            )
          })}
        </section>

        <CartSummary
          totalItems={cart.totalItems}
          totalTtc={cart.totalTtc}
          isCheckoutDisabled={isCheckoutDisabled}
          checkoutDisabledReason={checkoutDisabledReason}
        />
      </div>
    </section>
  )
}
