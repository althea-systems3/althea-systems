"use client"

import { useEffect, useState } from "react"

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
import type { HomeFixedTextPayload } from "@/lib/home-fixed-text/homeFixedText"

type EditorStatus = {
  message: string
  isError: boolean
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

export function AdminHomeFixedTextSection() {
  const [selectedLocale, setSelectedLocale] = useState<AppLocale>("fr")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<EditorStatus | null>(null)

  const [title, setTitle] = useState("")
  const [contentMarkdown, setContentMarkdown] = useState("")
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const loadContent = async () => {
      setIsLoading(true)
      setStatus(null)

      try {
        const response = await adminFetch(
          `/api/admin/pages/texte-fixe-home?locale=${selectedLocale}`,
          {
            cache: "no-store",
          },
        )

        const payload = (await response
          .json()
          .catch(() => null)) as HomeFixedTextPayload | null

        if (!response.ok || !payload) {
          if (!isCancelled) {
            setStatus({
              message: "Impossible de charger le texte fixe home.",
              isError: true,
            })
          }

          return
        }

        if (!isCancelled) {
          setTitle(payload.title ?? "")
          setContentMarkdown(payload.contentMarkdown)
          setUpdatedAt(payload.updatedAt)
          setStatus(null)
        }
      } catch (error) {
        console.error("Erreur chargement texte fixe home admin", {
          error,
          selectedLocale,
        })

        if (!isCancelled) {
          setStatus({
            message: "Impossible de charger le texte fixe home.",
            isError: true,
          })
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadContent()

    return () => {
      isCancelled = true
    }
  }, [selectedLocale])

  async function handleSave() {
    setIsSaving(true)
    setStatus(null)

    try {
      const response = await adminFetch("/api/admin/pages/texte-fixe-home", {
        method: "PUT",
        body: JSON.stringify({
          locale: selectedLocale,
          title,
          contentMarkdown,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | HomeFixedTextPayload
        | { error?: string }
        | null

      if (!response.ok) {
        const errorMessage =
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Impossible d'enregistrer le texte fixe home."

        setStatus({
          message: errorMessage,
          isError: true,
        })

        return
      }

      const typedPayload = payload as HomeFixedTextPayload

      setUpdatedAt(typedPayload.updatedAt)
      setStatus({
        message: "Texte fixe home enregistre avec succes.",
        isError: false,
      })
    } catch (error) {
      console.error("Erreur sauvegarde texte fixe home admin", {
        error,
        selectedLocale,
      })

      setStatus({
        message: "Impossible d'enregistrer le texte fixe home.",
        isError: true,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section
      className="space-y-6"
      aria-labelledby="admin-home-fixed-text-title"
    >
      <header className="space-y-1">
        <h1
          id="admin-home-fixed-text-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Contenu editorial home
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Modifiez le texte fixe affiche sous le carrousel de la page
          d&apos;accueil.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand-nav">Parametres du texte</CardTitle>
          <CardDescription>
            Choisissez la locale et mettez a jour le titre ainsi que le contenu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="space-y-1.5" htmlFor="home-fixed-text-locale">
            <span className="text-sm font-medium text-brand-nav">Locale</span>
            <select
              id="home-fixed-text-locale"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm sm:max-w-xs"
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

          <label className="space-y-1.5" htmlFor="home-fixed-text-title">
            <span className="text-sm font-medium text-brand-nav">Titre</span>
            <input
              id="home-fixed-text-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titre optionnel"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1.5" htmlFor="home-fixed-text-content">
            <span className="text-sm font-medium text-brand-nav">Contenu</span>
            <textarea
              id="home-fixed-text-content"
              value={contentMarkdown}
              onChange={(event) => setContentMarkdown(event.target.value)}
              rows={8}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              placeholder="Texte avec **gras**, *italique* et [liens](/contact)."
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
