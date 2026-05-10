export type CarouselSlide = {
  id: string
  imageUrl: string
  imageDesktopUrl?: string
  imageMobileUrl?: string
  imageAlt: string
  title: string
  description: string
  ctaLabel: string
  redirectUrl: string | null
}

export type CarouselApiResponse = {
  slides: CarouselSlide[]
  isFallbackData?: boolean
}
