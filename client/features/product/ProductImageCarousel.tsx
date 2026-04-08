"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { ProductImage } from "./productTypes"

type ProductImageCarouselProps = {
  images: ProductImage[]
  productName: string
}

const SWIPE_THRESHOLD_PX = 40

export function ProductImageCarousel({
  images,
  productName,
}: ProductImageCarouselProps) {
  const t = useTranslations("ProductPage")
  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const hasImages = images.length > 0
  const activeImage = hasImages ? images[activeIndex] : null

  const goToPreviousImage = () => {
    if (images.length <= 1) {
      return
    }

    setActiveIndex((currentIndex) => {
      return currentIndex === 0 ? images.length - 1 : currentIndex - 1
    })
  }

  const goToNextImage = () => {
    if (images.length <= 1) {
      return
    }

    setActiveIndex((currentIndex) => {
      return currentIndex === images.length - 1 ? 0 : currentIndex + 1
    })
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null)
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || images.length <= 1) {
      setTouchStartX(null)
      return
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX
    const deltaX = touchEndX - touchStartX

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      setTouchStartX(null)
      return
    }

    if (deltaX > 0) {
      goToPreviousImage()
    } else {
      goToNextImage()
    }

    setTouchStartX(null)
  }

  return (
    <section aria-label={t("gallery.sectionLabel")} className="space-y-3">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeImage ? (
          <Image
            src={activeImage.url}
            alt={
              activeImage.altText ??
              t("gallery.imageAlt", { productName, index: activeIndex + 1 })
            }
            fill
            priority={activeIndex === 0}
            loading={activeIndex === 0 ? undefined : "lazy"}
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-nav/90 to-brand-cta/80"
            aria-hidden="true"
          >
            <span className="heading-font px-4 text-center text-lg text-white sm:text-xl">
              {t("gallery.fallbackLabel")}
            </span>
          </div>
        )}

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPreviousImage}
              aria-label={t("gallery.previousImage")}
              className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-brand-nav shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={goToNextImage}
              aria-label={t("gallery.nextImage")}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-brand-nav shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600" aria-live="polite">
            {t("gallery.imageCounter", {
              current: activeIndex + 1,
              total: images.length,
            })}
          </p>

          <div className="flex flex-wrap gap-2" role="tablist">
            {images.map((image, index) => {
              const isActive = index === activeIndex

              return (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={t("gallery.goToImage", { index: index + 1 })}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "relative h-14 w-14 overflow-hidden rounded-md border transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2",
                    isActive
                      ? "border-brand-cta ring-1 ring-brand-cta"
                      : "border-slate-200 opacity-80 hover:opacity-100",
                  )}
                >
                  <Image
                    src={image.url}
                    alt={
                      image.altText ??
                      t("gallery.imageAlt", {
                        productName,
                        index: index + 1,
                      })
                    }
                    fill
                    loading="lazy"
                    sizes="56px"
                    className="object-cover"
                  />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}
