"use client"

import { Languages, Loader2, RefreshCw } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  defaultLocale,
  isAppLocale,
  localeDisplayNames,
  type AppLocale,
} from "@/lib/i18n"

type TranslatableFieldInput = {
  key: string
  value: string | Record<string, string> | null
  format?: "plain" | "markdown" | "key-value-map"
}

type TranslationContext =
  | "product"
  | "category"
  | "page"
  | "editorial"
  | "carousel-slide"

type TranslationsMap = Record<
  string,
  Record<string, string | Record<string, string> | null>
>

export type AdminTranslationCardProps = {
  context: TranslationContext
  fields: TranslatableFieldInput[]
  initialSourceLocale?: AppLocale | null
  initialTranslations?: TranslationsMap | null
  onTranslated?: (params: {
    detectedSourceLocale: AppLocale
    translations: TranslationsMap
  }) => void | Promise<void>
  helperText?: string
}

const FIELD_PREVIEW_MAX_CHARS = 160

function summarizeFieldValue(
  value: string | Record<string, string> | null,
): string {
  if (value === null) return "—"
  if (typeof value === "string") {
    if (value.length === 0) return "—"
    return value.length > FIELD_PREVIEW_MAX_CHARS
      ? `${value.slice(0, FIELD_PREVIEW_MAX_CHARS)}…`
      : value
  }
  return Object.entries(value)
    .map(([key, val]) => `${key}: ${val}`)
    .join(" · ")
}

export function AdminTranslationCard({
  context,
  fields,
  initialSourceLocale,
  initialTranslations,
  onTranslated,
  helperText,
}: AdminTranslationCardProps) {
  const [translations, setTranslations] = useState<TranslationsMap>(
    initialTranslations ?? {},
  )
  const [sourceLocale, setSourceLocale] = useState<AppLocale | null>(
    initialSourceLocale ?? null,
  )
  const [isTranslating, setIsTranslating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleRetranslate() {
    setIsTranslating(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, fields }),
      })

      const data = (await response.json()) as
        | {
            detectedSourceLocale: string
            translations: TranslationsMap
          }
        | { error: string }

      if (!response.ok) {
        const message =
          "error" in data ? data.error : "La traduction a echoue."
        setErrorMessage(message)
        return
      }

      if (!("detectedSourceLocale" in data)) {
        setErrorMessage("Reponse invalide.")
        return
      }

      const detected = isAppLocale(data.detectedSourceLocale)
        ? (data.detectedSourceLocale as AppLocale)
        : defaultLocale

      setSourceLocale(detected)
      setTranslations(data.translations)

      if (onTranslated) {
        await onTranslated({
          detectedSourceLocale: detected,
          translations: data.translations,
        })
      }
    } catch {
      setErrorMessage("Erreur reseau.")
    } finally {
      setIsTranslating(false)
    }
  }

  const localesWithTranslations = Object.keys(translations).filter(isAppLocale)

  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-brand-nav">
            <Languages className="size-4" aria-hidden="true" />
            Traductions automatiques
          </h3>
          <p className="text-xs text-slate-600">
            {helperText ??
              "La langue source est detectee automatiquement. Les autres langues sont traduites par IA."}
          </p>
          {sourceLocale ? (
            <p className="text-xs text-slate-500">
              Langue source detectee :{" "}
              <span className="font-medium text-brand-nav">
                {localeDisplayNames[sourceLocale]}
              </span>
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRetranslate}
          disabled={isTranslating}
        >
          {isTranslating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          {isTranslating ? "Traduction…" : "Re-traduire"}
        </Button>
      </header>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {localesWithTranslations.length > 0 ? (
        <ul className="space-y-3 text-xs">
          {localesWithTranslations.map((locale) => {
            const fieldsForLocale = translations[locale] ?? {}
            return (
              <li
                key={locale}
                className="rounded-md border border-border/60 bg-slate-50 p-3"
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {localeDisplayNames[locale as AppLocale]}
                </p>
                <dl className="space-y-1.5">
                  {Object.entries(fieldsForLocale).map(([fieldKey, value]) => (
                    <div key={fieldKey} className="flex gap-2">
                      <dt className="min-w-24 font-medium text-slate-600">
                        {fieldKey}
                      </dt>
                      <dd className="flex-1 break-words text-slate-700">
                        {summarizeFieldValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">
          Aucune traduction enregistree pour le moment. Sauvegardez ou cliquez
          sur « Re-traduire » pour generer les versions dans les autres langues.
        </p>
      )}
    </section>
  )
}
