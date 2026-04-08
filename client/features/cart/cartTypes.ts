export type CartLine = {
  id: string
  productId: string
  name: string
  slug: string
  priceTtc: number
  quantity: number
  stockQuantity: number
  isAvailable: boolean
  isStockSufficient: boolean
  subtotalTtc: number
  imageUrl: string | null
}

export type CartResponse = {
  cartId: string | null
  lines: CartLine[]
  totalItems: number
  totalTtc: number
}

export type CartLineMutationErrorResponse = {
  error?: string
  availableStock?: number
  currentCartQuantity?: number
}

export type CartLineMutationState = {
  isUpdating: boolean
  errorMessage: string | null
}
