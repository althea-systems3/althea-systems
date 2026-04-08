import { CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

export default async function CheckoutConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const params = await searchParams
  const orderNumber = typeof params.order === "string" ? params.order : null

  return (
    <section className="container py-8 pb-14 sm:py-10 sm:pb-20">
      <Card className="mx-auto max-w-3xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-2 pb-3 text-center">
          <div className="mx-auto inline-flex rounded-full bg-brand-success/15 p-2 text-brand-success">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="heading-font text-2xl text-brand-nav sm:text-3xl">
            Achat confirme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-slate-700 sm:text-base">
          <p>
            Merci pour votre commande. Votre paiement a bien ete pris en compte
            et votre commande est en cours de traitement.
          </p>
          <p className="font-semibold text-brand-nav">
            {orderNumber
              ? `Reference commande : ${orderNumber}`
              : "Reference commande indisponible"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button
              asChild
              className="bg-brand-cta text-white hover:bg-brand-cta/90"
            >
              <Link href="/mon-compte/commandes">Voir mes commandes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/catalogue">Continuer mes achats</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
