"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"

export function CheckoutPageLoadingState() {
  return (
    <div
      aria-live="polite"
      aria-label="Chargement du checkout"
      className="space-y-4"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <article
          key={`checkout-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </article>
      ))}
    </div>
  )
}

export function CheckoutPageErrorState({
  onRetry,
}: {
  onRetry: () => Promise<unknown> | void
}) {
  return (
    <Card className="border-dashed border-red-200 bg-red-50/50" role="alert">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">Checkout indisponible</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700 sm:text-base">
        <p>
          Impossible de charger le checkout pour le moment. Veuillez reessayer.
        </p>
        <Button type="button" variant="outline" onClick={() => void onRetry()}>
          Reessayer
        </Button>
      </CardContent>
    </Card>
  )
}

export function CheckoutPageBlockedState() {
  return (
    <Card className="border-dashed border-slate-300 bg-white" role="status">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-nav">
          Checkout non accessible
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700 sm:text-base">
        <p>
          Votre panier est vide ou n&apos;est plus payable. Retournez au panier
          pour continuer.
        </p>
        <Button
          asChild
          className="bg-brand-cta text-white hover:bg-brand-cta/90"
        >
          <Link href="/panier">Retour au panier</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
