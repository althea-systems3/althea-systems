import { useCallback, useEffect, useState } from "react"
import {
  EMPTY_CART,
  normalizeCartResponse,
  syncCartLayoutState,
} from "./cartUtils"
import type { CartResponse } from "./cartTypes"

type ReloadCartOptions = {
  silent?: boolean
}

type UseCartDataState = {
  cart: CartResponse
  setCart: React.Dispatch<React.SetStateAction<CartResponse>>
  isCartLoading: boolean
  isCartRefreshing: boolean
  hasCartError: boolean
  reloadCart: (options?: ReloadCartOptions) => Promise<CartResponse | null>
}

async function fetchCartData(abortSignal?: AbortSignal): Promise<CartResponse> {
  const response = await fetch("/api/cart", {
    method: "GET",
    cache: "no-store",
    signal: abortSignal,
  })

  if (!response.ok) {
    throw new Error(`Failed to load cart: ${response.status}`)
  }

  const payload = await response.json()
  return normalizeCartResponse(payload)
}

export function useCartData(): UseCartDataState {
  const [cart, setCart] = useState<CartResponse>(EMPTY_CART)
  const [isCartLoading, setIsCartLoading] = useState(true)
  const [isCartRefreshing, setIsCartRefreshing] = useState(false)
  const [hasCartError, setHasCartError] = useState(false)

  const reloadCart = useCallback(
    async (options: ReloadCartOptions = {}): Promise<CartResponse | null> => {
      const isSilent = options.silent === true

      if (isSilent) {
        setIsCartRefreshing(true)
      } else {
        setIsCartLoading(true)
      }

      setHasCartError(false)

      try {
        const nextCart = await fetchCartData()
        setCart(nextCart)
        syncCartLayoutState(nextCart.totalItems, nextCart.totalTtc)
        return nextCart
      } catch (error) {
        console.error("Failed to load cart", { error })
        setHasCartError(true)
        return null
      } finally {
        if (isSilent) {
          setIsCartRefreshing(false)
        } else {
          setIsCartLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    const abortController = new AbortController()

    const loadInitialCart = async () => {
      setIsCartLoading(true)
      setHasCartError(false)

      try {
        const initialCart = await fetchCartData(abortController.signal)
        setCart(initialCart)
        syncCartLayoutState(initialCart.totalItems, initialCart.totalTtc)
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error("Failed to load initial cart", { error })
        setHasCartError(true)
      } finally {
        if (!abortController.signal.aborted) {
          setIsCartLoading(false)
        }
      }
    }

    loadInitialCart()

    return () => {
      abortController.abort()
    }
  }, [])

  return {
    cart,
    setCart,
    isCartLoading,
    isCartRefreshing,
    hasCartError,
    reloadCart,
  }
}
