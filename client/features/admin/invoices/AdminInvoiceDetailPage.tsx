"use client"

import {
  AlertCircle,
  ArrowLeft,
  Download,
  Mail,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatCurrency,
  formatDate,
  mapOrderStatusClassName,
  mapOrderStatusLabel,
} from "@/features/admin/adminUtils"
import { Link } from "@/i18n/navigation"

import {
  deleteAdminInvoiceById,
  fetchAdminInvoiceById,
  sendAdminInvoiceEmail,
} from "./adminInvoicesApi"
import type { AdminInvoiceDetailPayload } from "./adminInvoicesTypes"
import { mapCreditNoteMotifUi, mapInvoiceStatusUi } from "./adminInvoicesUtils"

type AdminInvoiceDetailPageProps = {
  invoiceId: string
}

export function AdminInvoiceDetailPage({
  invoiceId,
}: AdminInvoiceDetailPageProps) {
  const [payload, setPayload] = useState<AdminInvoiceDetailPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const loadDetail = useCallback(
    async (options?: { silent?: boolean }) => {
      const isSilent = options?.silent === true

      if (isSilent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setErrorMessage(null)

      try {
        const nextPayload = await fetchAdminInvoiceById(invoiceId)
        setPayload(nextPayload)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le detail facture.",
        )
      } finally {
        if (isSilent) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [invoiceId],
  )

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  async function handleSendEmail() {
    const confirmed = window.confirm(
      "Confirmer le renvoi de cette facture par email au client ?",
    )

    if (!confirmed) {
      return
    }

    setIsSendingEmail(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await sendAdminInvoiceEmail(invoiceId)
      setNoticeMessage("Facture renvoyee par email avec succes.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de renvoyer la facture par email.",
      )
    } finally {
      setIsSendingEmail(false)
    }
  }

  async function handleDeleteInvoice() {
    const confirmed = window.confirm(
      "Cette action va annuler la facture et creer automatiquement un avoir. Confirmer ?",
    )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const result = await deleteAdminInvoiceById(invoiceId)
      setNoticeMessage(
        `Suppression traitee: ${result.message}. Avoir genere: ${result.creditNote.number}.`,
      )
      await loadDetail({ silent: true })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la facture.",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-invoice-detail-title"
      >
        <h1
          id="admin-invoice-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Detail facture
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement de la facture...
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!payload) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-invoice-detail-title"
      >
        <h1
          id="admin-invoice-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Detail facture
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-brand-error">
            {errorMessage || "Facture introuvable."}
          </CardContent>
        </Card>
      </section>
    )
  }

  const { invoice, history } = payload
  const statusUi = mapInvoiceStatusUi(invoice.statut)
  const creditNoteMotifUi = invoice.creditNote
    ? mapCreditNoteMotifUi(invoice.creditNote.motif)
    : null

  return (
    <section className="space-y-6" aria-labelledby="admin-invoice-detail-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-invoice-detail-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            Facture {invoice.numero_facture}
          </h1>
          <p className="text-sm text-slate-600">{invoice.id_facture}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/factures">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour liste
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/factures/${invoice.id_facture}/edition`}>
              Editer
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void loadDetail({ silent: true })
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {isRefreshing ? "Rafraichissement..." : "Rafraichir"}
          </Button>
        </div>
      </header>

      {errorMessage ? (
        <div
          className="flex items-start gap-2 rounded-xl border border-brand-error/20 bg-red-50 p-4 text-sm text-brand-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {noticeMessage ? (
        <div
          className="rounded-xl border border-brand-success/20 bg-emerald-50 p-4 text-sm text-brand-success"
          role="status"
          aria-live="polite"
        >
          {noticeMessage}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Actions facture
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {invoice.pdf_url ? (
            <Button asChild>
              <a href={invoice.pdf_url} target="_blank" rel="noreferrer">
                <Download className="size-4" aria-hidden="true" />
                Telecharger PDF
              </a>
            </Button>
          ) : (
            <p className="text-sm text-slate-600">PDF indisponible.</p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void handleSendEmail()
            }}
            disabled={isSendingEmail}
          >
            <Mail className="size-4" aria-hidden="true" />
            {isSendingEmail ? "Envoi..." : "Renvoyer par email"}
          </Button>

          <Button
            type="button"
            className="bg-brand-error text-white hover:bg-brand-error/90"
            onClick={() => {
              void handleDeleteInvoice()
            }}
            disabled={isDeleting}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {isDeleting
              ? "Suppression en cours..."
              : "Supprimer (creer un avoir)"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Informations facture
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Numero facture</p>
              <p className="mt-1 font-medium text-brand-nav">
                {invoice.numero_facture}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Date emission</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(invoice.date_emission)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Statut</p>
              <Badge className={`mt-1 ${statusUi.className}`}>
                {statusUi.label}
              </Badge>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Montant TTC</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatCurrency(invoice.montant_ttc)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Commande associee</p>
              {invoice.commande ? (
                <Link
                  href={`/admin/commandes/${invoice.commande.id_commande}`}
                  className="mt-1 inline-block font-medium text-brand-cta underline underline-offset-2"
                >
                  {invoice.commande.numero_commande}
                </Link>
              ) : (
                <p className="mt-1 text-slate-600">-</p>
              )}
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Client</p>
              <p className="mt-1 font-medium text-brand-nav">
                {invoice.client?.nom_complet || "-"}
              </p>
              <p>{invoice.client?.email || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Historique de base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun historique.</p>
            ) : (
              history.map((historyItem, index) => (
                <article
                  key={`${historyItem.type}-${historyItem.date}-${index}`}
                  className="rounded-md border border-border p-3 text-sm"
                >
                  <p className="font-medium text-brand-nav">
                    {historyItem.label}
                  </p>
                  <p className="text-slate-600">
                    {formatDate(historyItem.date)}
                  </p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">Avoir genere</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {invoice.creditNote ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Numero avoir</p>
                  <p className="mt-1 font-medium text-brand-nav">
                    {invoice.creditNote.numero_avoir}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Date emission</p>
                  <p className="mt-1 font-medium text-brand-nav">
                    {formatDate(invoice.creditNote.date_emission)}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Montant</p>
                  <p className="mt-1 font-medium text-brand-nav">
                    {formatCurrency(-Math.abs(invoice.creditNote.montant))}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Motif</p>
                  <Badge
                    className={`mt-1 ${creditNoteMotifUi?.className || ""}`}
                  >
                    {creditNoteMotifUi?.label || "-"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline">
                  <Link href={`/admin/avoirs/${invoice.creditNote.id_avoir}`}>
                    Voir le detail avoir
                  </Link>
                </Button>
                {invoice.creditNote.pdf_url ? (
                  <Button asChild variant="outline">
                    <a
                      href={invoice.creditNote.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Telecharger PDF avoir
                    </a>
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-slate-600">
              Aucun avoir lie a cette facture pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {invoice.commande ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Statuts de commande associee
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Statut commande</p>
              <Badge
                className={`mt-1 ${mapOrderStatusClassName(invoice.commande.statut)}`}
              >
                {mapOrderStatusLabel(invoice.commande.statut)}
              </Badge>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Statut paiement</p>
              <p className="mt-1 font-medium text-brand-nav">
                {invoice.commande.statut_paiement}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
