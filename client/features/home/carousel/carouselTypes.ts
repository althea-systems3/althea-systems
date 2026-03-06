export type CarouselSlide = {
  id: string
  imageUrl: string
  imageAlt: string
  title: string
  description: string
  ctaLabel: string
  redirectUrl: string
}

export type CarouselApiResponse = {
  slides: CarouselSlide[]
}
