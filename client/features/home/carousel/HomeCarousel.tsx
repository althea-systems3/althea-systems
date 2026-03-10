"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { useHomeCarousel } from "./useHomeCarousel"

function getSlideTransform(activeSlideIndex: number): string {
  return `translateX(-${activeSlideIndex * 100}%)`
}

export function HomeCarousel() {
  const translateCarousel = useTranslations("HomeCarousel")
  const {
    activeSlideIndex,
    carouselSlides,
    isAutoSlidePaused,
    isCarouselLoading,
    isSwipeEnabled,
    handleActivateSlide,
    handleGoToNextSlide,
    handleGoToPreviousSlide,
    handlePauseAutoSlide,
    handleResumeAutoSlide,
    handleStartSwipe,
    handleEndSwipe,
  } = useHomeCarousel()

  const hasNoSlides = !isCarouselLoading && carouselSlides.length === 0

  if (isCarouselLoading) {
    return (
      <Card
        aria-live="polite"
        className="relative overflow-hidden bg-slate-100"
      >
        <CardContent className="space-y-4 p-8 sm:p-12 lg:p-16">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (hasNoSlides) {
    return (
      <Card
        aria-live="polite"
        className="border-dashed border-slate-300 bg-white text-center"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-brand-nav">
            {translateCarousel("fallbackTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mx-auto max-w-xl text-sm text-slate-600 sm:text-base">
            {translateCarousel("fallbackDescription")}
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      aria-roledescription="carousel"
      aria-label={translateCarousel("ariaLabel")}
      onTouchStart={(touchEvent) => {
        handleStartSwipe(touchEvent.touches[0].clientX)
      }}
      onTouchEnd={(touchEvent) => {
        handleEndSwipe(touchEvent.changedTouches[0].clientX)
      }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-tr from-brand-nav/20 via-brand-cta/10 to-transparent"
        aria-hidden="true"
      />

      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: getSlideTransform(activeSlideIndex) }}
      >
        {carouselSlides.map((carouselSlide, slideIndex) => (
          <article
            key={carouselSlide.id}
            aria-roledescription="slide"
            aria-label={translateCarousel("slideCounter", {
              current: slideIndex + 1,
              total: carouselSlides.length,
            })}
            className="relative min-w-full"
          >
            <div className="relative min-h-[360px] w-full sm:min-h-[440px] lg:min-h-[520px]">
              <Image
                src={carouselSlide.imageUrl}
                alt={carouselSlide.imageAlt}
                fill
                priority={slideIndex === 0}
                loading={slideIndex === 0 ? "eager" : "lazy"}
                sizes="(max-width: 768px) 100vw, 1200px"
                className="object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/35 to-transparent" />

              <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white sm:p-10 lg:max-w-2xl">
                <Badge className="w-fit bg-brand-cta text-white hover:bg-brand-cta/90">
                  {translateCarousel("badgeLabel")}
                </Badge>
                <h2 className="heading-font text-center text-2xl sm:text-3xl lg:text-left lg:text-4xl">
                  {carouselSlide.title}
                </h2>
                <p className="mt-3 text-center text-sm text-slate-100 sm:text-base lg:text-left">
                  {carouselSlide.description}
                </p>
                <div className="mt-6 flex justify-center lg:justify-start">
                  <Button
                    asChild
                    className="rounded-full bg-brand-cta px-6 hover:bg-brand-cta/90"
                  >
                    <Link href={carouselSlide.redirectUrl}>
                      {carouselSlide.ctaLabel}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {isSwipeEnabled ? (
        <>
          <div className="absolute inset-y-0 start-0 z-20 hidden items-center ps-2 sm:flex">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-full"
              onClick={handleGoToPreviousSlide}
              aria-label={translateCarousel("previous")}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Button>
          </div>

          <div className="absolute inset-y-0 end-0 z-20 hidden items-center pe-2 sm:flex">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-full"
              onClick={handleGoToNextSlide}
              aria-label={translateCarousel("next")}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Button>
          </div>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 sm:bottom-5">
            {carouselSlides.map((carouselSlide, slideIndex) => {
              const isActiveSlide = slideIndex === activeSlideIndex

              return (
                <button
                  key={carouselSlide.id}
                  type="button"
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    isActiveSlide
                      ? "w-8 bg-brand-cta"
                      : "w-2.5 bg-white/70 hover:bg-white",
                  )}
                  aria-label={translateCarousel("goToSlide", {
                    index: slideIndex + 1,
                  })}
                  aria-current={isActiveSlide ? "true" : undefined}
                  onClick={() => {
                    handleActivateSlide(slideIndex)
                  }}
                />
              )
            })}

            <button
              type="button"
              className="ms-2 rounded-full bg-slate-900/65 p-2 text-white transition-colors hover:bg-slate-900"
              onClick={
                isAutoSlidePaused ? handleResumeAutoSlide : handlePauseAutoSlide
              }
              aria-label={
                isAutoSlidePaused
                  ? translateCarousel("resumeAutoSlide")
                  : translateCarousel("pauseAutoSlide")
              }
            >
              {isAutoSlidePaused ? (
                <Play className="size-4" aria-hidden="true" />
              ) : (
                <Pause className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
