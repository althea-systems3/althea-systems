import { useEffect, useState } from "react"

import type { HomeFixedTextPayload } from "@/lib/home-fixed-text/homeFixedText"

type UseHomeFixedTextState = {
  homeFixedTextPayload: HomeFixedTextPayload | null
  isHomeFixedTextLoading: boolean
}

async function fetchHomeFixedText(
  locale: string,
  abortSignal: AbortSignal,
): Promise<HomeFixedTextPayload> {
  const response = await fetch(
    `/api/pages/texte-fixe-home?locale=${encodeURIComponent(locale)}`,
    {
      method: "GET",
      signal: abortSignal,
      cache: "no-store",
    },
  )

  if (!response.ok) {
    throw new Error("Unable to load home fixed text")
  }

  return (await response.json()) as HomeFixedTextPayload
}

export function useHomeFixedText(locale: string): UseHomeFixedTextState {
  const [homeFixedTextPayload, setHomeFixedTextPayload] =
    useState<HomeFixedTextPayload | null>(null)
  const [isHomeFixedTextLoading, setIsHomeFixedTextLoading] = useState(true)

  useEffect(() => {
    const abortController = new AbortController()

    const loadHomeFixedText = async () => {
      setIsHomeFixedTextLoading(true)

      try {
        const payload = await fetchHomeFixedText(locale, abortController.signal)

        if (!abortController.signal.aborted) {
          setHomeFixedTextPayload(payload)
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error(
          "Failed to load fixed home text from /api/pages/texte-fixe-home",
          {
            error,
          },
        )

        setHomeFixedTextPayload(null)
      } finally {
        if (!abortController.signal.aborted) {
          setIsHomeFixedTextLoading(false)
        }
      }
    }

    void loadHomeFixedText()

    return () => {
      abortController.abort()
    }
  }, [locale])

  return {
    homeFixedTextPayload,
    isHomeFixedTextLoading,
  }
}
