import {
  CART_COUNT_STORAGE_KEY,
  CART_UPDATED_EVENT_NAME,
} from "@/features/layout/layoutConstants"
import type {
  CartCountApiResponse,
  ProductCharacteristicRow,
} from "./productTypes"

export const PRODUCT_PAGE_PATH_PREFIX = "/produits"

export function getProductPagePath(productSlug: string): string {
  return `${PRODUCT_PAGE_PATH_PREFIX}/${productSlug}`
}

export function formatProductPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(price)
}

function humanizeCharacteristicKey(key: string): string {
  const normalized = key.replace(/[_.-]+/g, " ").trim()

  if (!normalized) {
    return "Caracteristique"
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function serializeCharacteristicValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-"
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-"
    }

    const containsComplexItem = value.some(
      (item) => typeof item === "object" && item !== null,
    )

    if (containsComplexItem) {
      return JSON.stringify(value)
    }

    return value.map((item) => String(item)).join(", ")
  }

  return JSON.stringify(value)
}

function collectCharacteristics(
  value: unknown,
  path: string[],
  rows: ProductCharacteristicRow[],
): void {
  if (value === null || value === undefined) {
    if (path.length > 0) {
      rows.push({
        key: humanizeCharacteristicKey(path.join(" / ")),
        value: "-",
      })
    }
    return
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    if (path.length > 0) {
      rows.push({
        key: humanizeCharacteristicKey(path.join(" / ")),
        value: serializeCharacteristicValue(value),
      })
    }
    return
  }

  const entries = Object.entries(value as Record<string, unknown>)

  if (entries.length === 0 && path.length > 0) {
    rows.push({
      key: humanizeCharacteristicKey(path.join(" / ")),
      value: "-",
    })
    return
  }

  entries.forEach(([key, nestedValue]) => {
    const nextPath = [...path, key]

    if (
      nestedValue !== null &&
      typeof nestedValue === "object" &&
      !Array.isArray(nestedValue)
    ) {
      collectCharacteristics(nestedValue, nextPath, rows)
      return
    }

    rows.push({
      key: humanizeCharacteristicKey(nextPath.join(" / ")),
      value: serializeCharacteristicValue(nestedValue),
    })
  })
}

export function normalizeProductCharacteristics(
  characteristics: Record<string, unknown> | null,
): ProductCharacteristicRow[] {
  if (!characteristics) {
    return []
  }

  const rows: ProductCharacteristicRow[] = []
  collectCharacteristics(characteristics, [], rows)

  return rows
}

export async function syncCartCountStorage(): Promise<void> {
  if (typeof window === "undefined") {
    return
  }

  try {
    const response = await fetch("/api/cart/count", {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      return
    }

    const data = (await response.json()) as CartCountApiResponse

    const count =
      typeof data.count === "number" && Number.isFinite(data.count)
        ? Math.max(0, data.count)
        : 0

    window.localStorage.setItem(CART_COUNT_STORAGE_KEY, String(count))
    window.dispatchEvent(new Event(CART_UPDATED_EVENT_NAME))
  } catch (error) {
    console.error("Unable to sync cart count", { error })
  }
}
