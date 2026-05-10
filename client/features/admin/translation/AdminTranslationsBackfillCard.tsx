"use client"

import { Languages, Loader2, RefreshCw } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type BackfillStat = {
  table: string
  total: number
  translated: number
  skipped: number
  failed: number
  rateLimited?: boolean
  retryAfterSeconds?: number | null
}

type BackfillResponse = {
  target: string
  forceRetranslate: boolean
  stats: BackfillStat[]
  rateLimited?: boolean
  retryAfterSeconds?: number | null
}

function formatRetryDelay(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "quelques minutes"
  if (seconds < 60) return `${seconds}s`
  const mins = Math.ceil(seconds / 60)
  return `${mins} min`
}

export function AdminTranslationsBackfillCard() {
  const [isRunning, setIsRunning] = useState(false)
  const [forceRetranslate, setForceRetranslate] = useState(false)
  const [lastResult, setLastResult] = useState<BackfillResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleRun() {
    setIsRunning(true)
    setErrorMessage(null)
    setLastResult(null)

    try {
      const response = await fetch("/api/admin/translate/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "all", forceRetranslate }),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        setErrorMessage(errorData?.error ?? "Le backfill a echoue.")
        return
      }

      const data = (await response.json()) as BackfillResponse
      setLastResult(data)
    } catch {
      setErrorMessage("Erreur reseau pendant le backfill.")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-brand-nav">
          <Languages className="size-4" aria-hidden="true" />
          Traductions automatiques
        </CardTitle>
        <CardDescription>
          Regenerer les traductions IA pour toutes les entites (produits,
          categories, slides, pages statiques). Operation longue (~5s par
          entite).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={forceRetranslate}
            onChange={(event) => setForceRetranslate(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-brand-nav">
              Forcer la re-traduction
            </span>
            <br />
            Sans cette option : seules les entites sans traductions sont
            traitees. Avec : tout est ecrase.
          </span>
        </label>

        <Button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="w-full sm:w-auto"
        >
          {isRunning ? (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
          )}
          {isRunning
            ? "Backfill en cours..."
            : "Lancer le backfill des traductions"}
        </Button>

        {errorMessage ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {lastResult?.rateLimited ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">Quota Groq atteint</p>
            <p className="mt-1">
              Le backfill a ete interrompu. Limite quotidienne de tokens
              depassee. Reessayez dans environ{" "}
              <span className="font-medium">
                {formatRetryDelay(lastResult.retryAfterSeconds)}
              </span>
              , ou passez au tier payant Groq pour eviter cette limite.
            </p>
          </div>
        ) : null}

        {lastResult ? (
          <div className="space-y-2 rounded-md border border-border bg-slate-50 p-3 text-xs">
            <p className="font-medium text-brand-nav">Resultats</p>
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Table</th>
                  <th className="py-1 text-right">Total</th>
                  <th className="py-1 text-right">Traduit</th>
                  <th className="py-1 text-right">Ignore</th>
                  <th className="py-1 text-right">Echec</th>
                </tr>
              </thead>
              <tbody>
                {lastResult.stats.map((stat) => (
                  <tr key={stat.table} className="border-t border-border/60">
                    <td className="py-1 font-medium text-slate-700">
                      {stat.table}
                    </td>
                    <td className="py-1 text-right">{stat.total}</td>
                    <td className="py-1 text-right text-emerald-700">
                      {stat.translated}
                    </td>
                    <td className="py-1 text-right text-slate-500">
                      {stat.skipped}
                    </td>
                    <td className="py-1 text-right text-red-600">
                      {stat.failed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
