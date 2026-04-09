import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AUTO_SLIDE_INTERVAL_IN_MILLISECONDS,
  SWIPE_THRESHOLD_IN_PIXELS,
} from "./carouselConstants"
import type { CarouselApiResponse, CarouselSlide } from "./carouselTypes"

type UseHomeCarouselState = {
  activeSlideIndex: number
  carouselSlides: CarouselSlide[]
  isAutoSlidePaused: boolean
  isCarouselLoading: boolean
  isSwipeEnabled: boolean
  handleActivateSlide: (slideIndex: number) => void
  handleGoToNextSlide: () => void
  handleGoToPreviousSlide: () => void
  handlePauseAutoSlide: () => void
  handleResumeAutoSlide: () => void
  handleStartSwipe: (positionX: number) => void
  handleEndSwipe: (positionX: number) => void
}

function getLastSlideIndex(carouselSlides: CarouselSlide[]): number {
  return Math.max(carouselSlides.length - 1, 0)
}

function getNextSlideIndex(
  currentSlideIndex: number,
  carouselSlides: CarouselSlide[],
): number {
  if (carouselSlides.length === 0) {
    return 0
  }

  return currentSlideIndex === getLastSlideIndex(carouselSlides)
    ? 0
    : currentSlideIndex + 1
}

function getPreviousSlideIndex(
  currentSlideIndex: number,
  carouselSlides: CarouselSlide[],
): number {
  if (carouselSlides.length === 0) {
    return 0
  }

  return currentSlideIndex === 0
    ? getLastSlideIndex(carouselSlides)
    : currentSlideIndex - 1
}

async function fetchCarouselSlides(
  abortSignal: AbortSignal,
): Promise<CarouselSlide[]> {
  const response = await fetch("/api/carousel", {
    method: "GET",
    signal: abortSignal,
  })

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as CarouselApiResponse
  return Array.isArray(payload.slides) ? payload.slides : []
}

export function useHomeCarousel(isRtl = false): UseHomeCarouselState {
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([])
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [isCarouselLoading, setIsCarouselLoading] = useState(true)
  const [isAutoSlidePaused, setIsAutoSlidePaused] = useState(false)
  const swipeStartPositionXRef = useRef<number | null>(null)

  const isSwipeEnabled = useMemo(() => {
    return carouselSlides.length > 1
  }, [carouselSlides])

  const handleGoToNextSlide = useCallback(() => {
    setActiveSlideIndex((currentSlideIndex) => {
      return getNextSlideIndex(currentSlideIndex, carouselSlides)
    })
  }, [carouselSlides])

  const handleGoToPreviousSlide = useCallback(() => {
    setActiveSlideIndex((currentSlideIndex) => {
      return getPreviousSlideIndex(currentSlideIndex, carouselSlides)
    })
  }, [carouselSlides])

  const handleActivateSlide = useCallback((slideIndex: number) => {
    setActiveSlideIndex(slideIndex)
  }, [])

  const handlePauseAutoSlide = useCallback(() => {
    setIsAutoSlidePaused(true)
  }, [])

  const handleResumeAutoSlide = useCallback(() => {
    setIsAutoSlidePaused(false)
  }, [])

  const handleStartSwipe = useCallback((positionX: number) => {
    swipeStartPositionXRef.current = positionX
  }, [])

  const handleEndSwipe = useCallback(
    (positionX: number) => {
      const swipeStartPositionX = swipeStartPositionXRef.current

      if (swipeStartPositionX === null || !isSwipeEnabled) {
        return
      }

      const swipeDeltaInPixels = positionX - swipeStartPositionX
      if (Math.abs(swipeDeltaInPixels) < SWIPE_THRESHOLD_IN_PIXELS) {
        swipeStartPositionXRef.current = null
        return
      }

      if (swipeDeltaInPixels > 0) {
        if (isRtl) {
          handleGoToNextSlide()
        } else {
          handleGoToPreviousSlide()
        }
      } else {
        if (isRtl) {
          handleGoToPreviousSlide()
        } else {
          handleGoToNextSlide()
        }
      }

      swipeStartPositionXRef.current = null
    },
    [handleGoToNextSlide, handleGoToPreviousSlide, isRtl, isSwipeEnabled],
  )

  useEffect(() => {
    const abortController = new AbortController()

    const loadSlides = async () => {
      setIsCarouselLoading(true)

      try {
        const loadedSlides = await fetchCarouselSlides(abortController.signal)
        setCarouselSlides(loadedSlides)
      } catch (error) {
        console.error("Failed to load carousel slides from /api/carousel", {
          error,
        })
        setCarouselSlides([])
      } finally {
        setIsCarouselLoading(false)
      }
    }

    loadSlides()

    return () => {
      abortController.abort()
    }
  }, [])

  useEffect(() => {
    if (carouselSlides.length === 0 || isAutoSlidePaused) {
      return
    }

    const autoSlideInterval = window.setInterval(() => {
      setActiveSlideIndex((currentSlideIndex) => {
        return getNextSlideIndex(currentSlideIndex, carouselSlides)
      })
    }, AUTO_SLIDE_INTERVAL_IN_MILLISECONDS)

    return () => {
      window.clearInterval(autoSlideInterval)
    }
  }, [carouselSlides, isAutoSlidePaused])

  useEffect(() => {
    if (activeSlideIndex > getLastSlideIndex(carouselSlides)) {
      setActiveSlideIndex(0)
    }
  }, [activeSlideIndex, carouselSlides])

  return {
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
  }
}
