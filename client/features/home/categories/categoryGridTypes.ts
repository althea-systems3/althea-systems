export type HomeCategory = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
}

export type HomeCategoriesApiResponse = {
  categories: HomeCategory[]
  isFallbackData?: boolean
}
