"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { adminFetch } from "@/features/admin/adminApi"
import { locales, type AppLocale } from "@/lib/i18n"
import {
  STATIC_PAGE_SLUGS,
  STATIC_PAGE_DEFAULTS,
  type StaticPageSlug,
} from "@/lib/static-pages/staticPages"

type AdminStaticPagePayload = {
  slug: StaticPageSlug
  locale: AppLocale
  title: string
  description: string | null
  contentMarkdown: string
  updatedAt: string | null
  isFallbackData: boolean
}

type AdminStaticPagesEditorPageProps = {
  initialSlug?: StaticPageSlug
}

type EditorStatus = {
  message: string
  isError: boolean
}

const PAGE_LABELS: Record<StaticPageSlug, string> = {
  cgu: "CGU",
  "mentions-legales": "Mentions legales",
  "a-propos": "A propos",
}

function formatDateTime(dateValue: string | null): string {
  if (!dateValue) {
    return "Non renseigne"
  }

  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return "Non renseigne"
  }

  return parsedDate.toLocaleString("fr-FR")
}

export function AdminStaticPagesEditorPage({
  initialSlug = "cgu",
}: AdminStaticPagesEditorPageProps) {
  const [selectedSlug, setSelectedSlug] = useState<StaticPageSlug>(initialSlug)
  const [selectedLocale, setSelectedLocale] = useState<AppLocale>("fr")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<EditorStatus | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [contentMarkdown, setContentMarkdown] = useState("")

  const defaultPreview = useMemo(
    () => STATIC_PAGE_DEFAULTS[selectedSlug],
    [selectedSlug],
  )

  useEffect(() => {
    let isCancelled = false

    const loadPage = async () => {
      setIsLoading(true)
      setStatus(null)

      try {
        const response = await adminFetch(
          `/api/admin/static-pages/${selectedSlug}?locale=${selectedLocale}`,
          {
            cache: "no-store",
          },
        )

        const payload = (await response
          .json()
          .catch(() => null)) as AdminStaticPagePayload | null

        if (!response.ok || !payload) {
          if (!isCancelled) {
            setStatus({
              message: "Impossible de charger le contenu de cette page.",
              isError: true,
            })
          }

          return
        }

        if (!isCancelled) {
          setTitle(payload.title)
          setDescription(payload.description ?? "")
          setContentMarkdown(payload.contentMarkdown)
          setUpdatedAt(payload.updatedAt)

          if (payload.isFallbackData) {
            setStatus({
              message:
                "Aucune version enregistree pour cette locale. Valeurs par defaut chargees.",
              isError: false,
            })
          } else {
            setStatus(null)
          }
        }
      } catch (error) {
        console.error("Erreur chargement page statique admin", {
          error,
          selectedSlug,
          selectedLocale,
        })

        if (!isCancelled) {
          setStatus({
            message: "Impossible de charger le contenu de cette page.",
            isError: true,
          })
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPage()

    return () => {
      isCancelled = true
    }
  }, [selectedLocale, selectedSlug])

  async function handleSave() {
    setIsSaving(true)
    setStatus(null)

    try {
      const response = await adminFetch(
        `/api/admin/static-pages/${selectedSlug}`,
        {
          method: "PUT",
          body: JSON.stringify({
            locale: selectedLocale,
            title,
            description,
            contentMarkdown,
          }),
        },
      )

      const payload = (await response.json().catch(() => null)) as
        | AdminStaticPagePayload
        | { error?: string }
        | null

      if (!response.ok) {
        const message =
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Impossible d'enregistrer cette page."

        setStatus({
          message,
          isError: true,
        })
        return
      }

      const typedPayload = payload as AdminStaticPagePayload

      setUpdatedAt(typedPayload.updatedAt)
      setStatus({
        message: "Page enregistree avec succes.",
        isError: false,
      })
    } catch (error) {
      console.error("Erreur sauvegarde page statique admin", {
        error,
        selectedSlug,
        selectedLocale,
      })

      setStatus({
        message: "Impossible d'enregistrer cette page.",
        isError: true,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="admin-static-pages-title">
      <header className="space-y-1">
        <h1
          id="admin-static-pages-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Pages statiques
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Editez les contenus publics CGU, Mentions legales et A propos.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand-nav">Selection</CardTitle>
          <CardDescription>
            Choisissez la page et la langue a mettre a jour.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5" htmlFor="static-page-slug">
            <span className="text-sm font-medium text-brand-nav">Page</span>
            <select
              id="static-page-slug"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              value={selectedSlug}
              onChange={(event) => {
                setSelectedSlug(event.target.value as StaticPageSlug)
              }}
            >
              {STATIC_PAGE_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {PAGE_LABELS[slug]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5" htmlFor="static-page-locale">
            <span className="text-sm font-medium text-brand-nav">Locale</span>
            <select
              id="static-page-locale"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              value={selectedLocale}
              onChange={(event) => {
                setSelectedLocale(event.target.value as AppLocale)
              }}
            >
              {locales.map((localeCode) => (
                <option key={localeCode} value={localeCode}>
                  {localeCode.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand-nav">Contenu editorial</CardTitle>
          <CardDescription>
            Format supporte: H2/H3, paragraphes, listes, liens markdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="space-y-1.5" htmlFor="static-page-title">
            <span className="text-sm font-medium text-brand-nav">Titre</span>
            <input
              id="static-page-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={defaultPreview.title}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1.5" htmlFor="static-page-description">
            <span className="text-sm font-medium text-brand-nav">
              Description
            </span>
            <textarea
              id="static-page-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              placeholder={defaultPreview.description}
            />
          </label>

          <label className="space-y-1.5" htmlFor="static-page-content">
            <span className="text-sm font-medium text-brand-nav">
              Contenu markdown
            </span>
            <textarea
              id="static-page-content"
              value={contentMarkdown}
              onChange={(event) => setContentMarkdown(event.target.value)}
              rows={16}
              className="w-full rounded-md border border-border bg-white px-3 py-2 font-mono text-sm"
              placeholder="## Titre\nParagraphe..."
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                void handleSave()
              }}
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>

            <p className="text-xs text-slate-500">
              Derniere mise a jour: {formatDateTime(updatedAt)}
            </p>
          </div>

          {status ? (
            <p
              className={
                status.isError
                  ? "text-sm text-brand-error"
                  : "text-sm text-emerald-700"
              }
              role={status.isError ? "alert" : "status"}
            >
              {status.message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
