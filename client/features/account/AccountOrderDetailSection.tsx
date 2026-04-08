"use client"

import { ArrowLeft, FileText, Loader2 } from "lucide-react"
import { useLocale } from "next-intl"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import {
  formatAccountDate,
  formatAccountPrice,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "./accountUtils"

type OrderDetailPayload = {
  order: {
    orderNumber: string
    status: string
    paymentStatus: string
    totalHt: number
    totalTva: number
    totalTtc: number
    createdAt: string
  }
  lines: Array<{
    productId: string
    productName: string
    productSlug: string
    imageUrl: string | null
    quantity: number
    unitPriceHt: number
    totalTtc: number
  }>
  invoice: {
    invoiceNumber: string
    status: string
    pdfUrl: string | null
  } | null
}

type AccountOrderDetailSectionProps = {
  orderNumber: string
}

function getSessionExpiredPath(pathname: string): string {
  const query = new URLSearchParams({
    reason: "session_expired",
    next: pathname,
  })

  return `/connexion?${query.toString()}`
}

export function AccountOrderDetailSection({
  orderNumber,
}: AccountOrderDetailSectionProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const [orderDetail, setOrderDetail] = useState<OrderDetailPayload | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadOrderDetail = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(
          `/api/orders/${orderNumber}/confirmation`,
          {
            cache: "no-store",
          },
        )

        if (response.status === 401) {
          router.replace(getSessionExpiredPath(pathname))
          return
        }

        if (response.status === 403) {
          if (isMounted) {
            setErrorMessage("Acces refuse a cette commande.")
          }
          return
        }

        if (response.status === 404) {
          if (isMounted) {
            setErrorMessage("Commande introuvable.")
          }
          return
        }

        if (!response.ok) {
          if (isMounted) {
            setErrorMessage("Impossible de charger le detail de la commande.")
          }
          return
        }

        const payload = await response.json().catch(() => null)

        if (!isMounted) {
          return
        }

        setOrderDetail(payload as OrderDetailPayload)
      } catch (error) {
        console.error("Erreur chargement detail commande compte", { error })

        if (isMounted) {
          setErrorMessage("Une erreur serveur est survenue.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadOrderDetail()

    return () => {
      isMounted = false
    }
  }, [orderNumber, pathname, router])

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-slate-600"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Chargement du detail commande...
      </div>
    )
  }

  if (errorMessage || !orderDetail) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-error" role="alert">
          {errorMessage ?? "Commande indisponible."}
        </p>
        <Button asChild variant="outline">
          <Link href="/mon-compte/commandes">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Retour aux commandes
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="heading-font text-xl text-brand-nav">
          Commande {orderDetail.order.orderNumber}
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/mon-compte/commandes">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Retour
          </Link>
        </Button>
      </div>

      <section className="rounded-xl border border-border p-4 text-sm">
        <p>
          <span className="font-medium text-brand-nav">Date:</span>{" "}
          {formatAccountDate(orderDetail.order.createdAt, locale)}
        </p>
        <p>
          <span className="font-medium text-brand-nav">Statut commande:</span>{" "}
          {getOrderStatusLabel(orderDetail.order.status)}
        </p>
        <p>
          <span className="font-medium text-brand-nav">Statut paiement:</span>{" "}
          {getPaymentStatusLabel(orderDetail.order.paymentStatus)}
        </p>
        <p>
          <span className="font-medium text-brand-nav">Montant HT:</span>{" "}
          {formatAccountPrice(orderDetail.order.totalHt, locale)}
        </p>
        <p>
          <span className="font-medium text-brand-nav">TVA:</span>{" "}
          {formatAccountPrice(orderDetail.order.totalTva, locale)}
        </p>
        <p className="font-semibold text-brand-nav">
          Total TTC: {formatAccountPrice(orderDetail.order.totalTtc, locale)}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-brand-nav">Produits</h3>
        <ul className="space-y-2">
          {orderDetail.lines.map((line) => (
            <li
              key={line.productId}
              className="rounded-xl border border-border p-3"
            >
              <p className="font-medium text-brand-nav">{line.productName}</p>
              <p className="text-sm text-slate-700">
                Quantite: {line.quantity}
              </p>
              <p className="text-sm text-slate-700">
                Total ligne: {formatAccountPrice(line.totalTtc, locale)}
              </p>
              {line.productSlug ? (
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href={`/produits/${line.productSlug}`}>
                    Voir le produit
                  </Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-brand-nav">
          Document associe
        </h3>

        {orderDetail.invoice?.pdfUrl ? (
          <Button
            asChild
            className="mt-3 bg-brand-cta text-white hover:bg-brand-cta/90"
          >
            <a
              href={orderDetail.invoice.pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              <FileText className="size-4" aria-hidden="true" />
              Telecharger la facture {orderDetail.invoice.invoiceNumber}
            </a>
          </Button>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Aucune facture disponible.
          </p>
        )}
      </section>
    </div>
  )
}
