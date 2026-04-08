import {
  CART_COUNT_STORAGE_KEY,
  CART_UPDATED_EVENT_NAME,
} from "@/features/layout/layoutConstants"
import { CART_EMPTY_TOTAL } from "./cartConstants"
import type {
  CartLine,
  CartLineMutationErrorResponse,
  CartResponse,
} from "./cartTypes"

const CART_TOTAL_STORAGE_KEY = "althea:cart_total"

export const EMPTY_CART: CartResponse = {
  cartId: null,
  lines: [],
  totalItems: 0,
  totalTtc: CART_EMPTY_TOTAL,
}

export function formatCartPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(price)
}

export function computeCartTotalsFromLines(lines: CartLine[]): {
  totalItems: number
  totalTtc: number
} {
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0)
  const totalTtc = lines.reduce((sum, line) => sum + line.subtotalTtc, 0)

  return {
    totalItems,
    totalTtc: Math.round(totalTtc * 100) / 100,
  }
}

function normalizeLine(rawLine: unknown): CartLine | null {
  const parsedLine = rawLine as Partial<CartLine>

  if (
    typeof parsedLine?.id !== "string" ||
    typeof parsedLine?.productId !== "string" ||
    typeof parsedLine?.name !== "string" ||
    typeof parsedLine?.slug !== "string" ||
    typeof parsedLine?.priceTtc !== "number" ||
    typeof parsedLine?.quantity !== "number" ||
    typeof parsedLine?.stockQuantity !== "number" ||
    typeof parsedLine?.isAvailable !== "boolean" ||
    typeof parsedLine?.isStockSufficient !== "boolean" ||
    typeof parsedLine?.subtotalTtc !== "number"
  ) {
    return null
  }

  return {
    id: parsedLine.id,
    productId: parsedLine.productId,
    name: parsedLine.name,
    slug: parsedLine.slug,
    priceTtc: parsedLine.priceTtc,
    quantity: parsedLine.quantity,
    stockQuantity: parsedLine.stockQuantity,
    isAvailable: parsedLine.isAvailable,
    isStockSufficient: parsedLine.isStockSufficient,
    subtotalTtc: parsedLine.subtotalTtc,
    imageUrl:
      typeof parsedLine.imageUrl === "string" ? parsedLine.imageUrl : null,
  }
}

export function normalizeCartResponse(payload: unknown): CartResponse {
  const parsedPayload = payload as Partial<CartResponse>
  const normalizedLines = Array.isArray(parsedPayload?.lines)
    ? parsedPayload.lines
        .map((line) => normalizeLine(line))
        .filter((line): line is CartLine => line !== null)
    : []

  const { totalItems, totalTtc } = computeCartTotalsFromLines(normalizedLines)

  return {
    cartId:
      typeof parsedPayload?.cartId === "string" ? parsedPayload.cartId : null,
    lines: normalizedLines,
    totalItems:
      typeof parsedPayload?.totalItems === "number" &&
      Number.isFinite(parsedPayload.totalItems)
        ? parsedPayload.totalItems
        : totalItems,
    totalTtc:
      typeof parsedPayload?.totalTtc === "number" &&
      Number.isFinite(parsedPayload.totalTtc)
        ? parsedPayload.totalTtc
        : totalTtc,
  }
}

export function syncCartLayoutState(
  totalItems: number,
  totalTtc: number,
): void {
  if (typeof window === "undefined") {
    return
  }

  const safeCount = Number.isFinite(totalItems)
    ? Math.max(0, Math.floor(totalItems))
    : 0

  const safeTotal = Number.isFinite(totalTtc)
    ? Math.max(0, Math.round(totalTtc * 100) / 100)
    : 0

  window.localStorage.setItem(CART_COUNT_STORAGE_KEY, String(safeCount))
  window.localStorage.setItem(CART_TOTAL_STORAGE_KEY, String(safeTotal))
  window.dispatchEvent(new Event(CART_UPDATED_EVENT_NAME))
}

export function extractCartLineErrorInfo(payload: unknown): {
  message: string | null
  availableStock: number | null
} {
  const parsedPayload = payload as CartLineMutationErrorResponse | null

  if (!parsedPayload || typeof parsedPayload !== "object") {
    return {
      message: null,
      availableStock: null,
    }
  }

  return {
    message:
      typeof parsedPayload.error === "string" ? parsedPayload.error : null,
    availableStock:
      typeof parsedPayload.availableStock === "number" &&
      Number.isFinite(parsedPayload.availableStock)
        ? parsedPayload.availableStock
        : null,
  }
}
