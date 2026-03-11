export type HomeTopProduct = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  price: number | null
  displayOrder: number
  isAvailable: boolean
}

export type HomeTopProductsApiResponse = {
  products: HomeTopProduct[]
  isFallbackData?: boolean
}
