export type ProductImage = {
  url: string
  ordre: number
  isMain: boolean
  altText: string | null
}

export type ProductDetail = {
  id: string
  name: string
  slug: string
  description: string | null
  priceHt: number
  tva: string
  priceTtc: number
  stockQuantity: number
  isAvailable: boolean
  characteristics: Record<string, unknown> | null
  images: ProductImage[]
}

export type ProductDetailApiResponse = {
  product: ProductDetail | null
  notFound?: boolean
}

export type SimilarProduct = {
  id: string
  name: string
  slug: string
  priceTtc: number | null
  isAvailable: boolean
  imageUrl: string | null
}

export type SimilarProductsApiResponse = {
  products: SimilarProduct[]
  notFound?: boolean
}

export type CartCountApiResponse = {
  count: number
  total: number
}

export type AddToCartApiErrorResponse = {
  error?: string
}

export type ProductCharacteristicRow = {
  key: string
  value: string
}
