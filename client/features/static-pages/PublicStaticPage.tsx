"use client"

import { EditorialContentRenderer } from "@/components/editorial/EditorialContentRenderer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "next-intl"
import { useEffect, useMemo, useState } from "react"

import { secureFetch } from "@/lib/http/secureFetch"
import {
  type StaticPageContentPayload,
  type StaticPageSlug,
} from "@/lib/static-pages/staticPages"

type PublicStaticPageProps = {
  slug: StaticPageSlug
  fallbackTitle: string
  fallbackDescription: string
}

type StaticPageStatusText = {
  loading: string
  loadingHint: string
  error: string
  empty: string
}

const STATUS_TEXT_BY_LOCALE: Record<string, StaticPageStatusText> = {
  fr: {
    loading: "Chargement du contenu...",
    loadingHint: "Le contenu editorial est en cours de recuperation.",
    error: "Le contenu n'est pas disponible pour le moment.",
    empty: "Cette page ne contient pas encore de contenu publie.",
  },
  en: {
    loading: "Loading content...",
    loadingHint: "Editorial content is being fetched.",
    error: "The content is currently unavailable.",
    empty: "This page does not contain any published content yet.",
  },
  es: {
    loading: "Cargando contenido...",
    loadingHint: "Se esta recuperando el contenido editorial.",
    error: "El contenido no esta disponible por ahora.",
    empty: "Esta pagina aun no contiene contenido publicado.",
  },
  ar: {
    loading: "Loading content...",
    loadingHint: "Editorial content is being fetched.",
    error: "The content is currently unavailable.",
    empty: "This page does not contain any published content yet.",
  },
}

export function PublicStaticPage({
  slug,
  fallbackTitle,
  fallbackDescription,
}: PublicStaticPageProps) {
  const locale = useLocale()

  const statusText = STATUS_TEXT_BY_LOCALE[locale] ?? STATUS_TEXT_BY_LOCALE.fr

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [contentPayload, setContentPayload] =
    useState<StaticPageContentPayload | null>(null)

  useEffect(() => {
    let isActive = true

    const loadContent = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await secureFetch(
          `/api/static-pages/${slug}?locale=${encodeURIComponent(locale)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        )

        const payload = (await response
          .json()
          .catch(() => null)) as StaticPageContentPayload | null

        if (!isActive) {
          return
        }

        if (!response.ok || !payload) {
          setErrorMessage(statusText.error)
          return
        }

        setContentPayload(payload)
      } catch (error) {
        console.error("Erreur chargement page statique", { error, slug })

        if (!isActive) {
          return
        }

        setErrorMessage(statusText.error)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadContent()

    return () => {
      isActive = false
    }
  }, [locale, slug, statusText.error])

  const pageTitle = useMemo(() => {
    return contentPayload?.title?.trim() || fallbackTitle
  }, [contentPayload?.title, fallbackTitle])

  const pageDescription = useMemo(() => {
    return contentPayload?.description?.trim() || fallbackDescription
  }, [contentPayload?.description, fallbackDescription])

  const hasEditorialContent =
    (contentPayload?.contentMarkdown?.trim().length ?? 0) > 0

  return (
    <section className="container py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
        <header className="rounded-2xl border border-border/80 bg-[#d4f4f7]/60 p-5 sm:p-7">
          <Badge
            variant="secondary"
            className="w-fit bg-[#d4f4f7] text-[#0a7490] hover:bg-[#c7edf1]"
          >
            Althea Systems
          </Badge>
          <h1 className="mt-2 heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-3 text-sm text-slate-700 sm:text-base">
            {pageDescription}
          </p>
        </header>

        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle
                className="text-lg text-brand-nav"
                role="status"
                aria-live="polite"
              >
                {statusText.loading}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">{statusText.loadingHint}</p>
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && errorMessage ? (
          <Card className="border-brand-error/30 bg-red-50">
            <CardContent className="pt-5">
              <p role="alert" className="text-sm text-brand-error sm:text-base">
                {errorMessage}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !errorMessage && !hasEditorialContent ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-slate-700 sm:text-base">
                {statusText.empty}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !errorMessage && hasEditorialContent ? (
          <Card className="border-border/80">
            <CardContent className="pt-6">
              <EditorialContentRenderer
                markdown={contentPayload?.contentMarkdown ?? ""}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
