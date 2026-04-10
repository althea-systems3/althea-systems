"use client"

import { AlertCircle, ArrowLeft, Download, Mail, RefreshCw } from "lucide-react"
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
  fetchAdminCreditNoteById,
  sendAdminCreditNoteEmail,
} from "./adminInvoicesApi"
import type { AdminCreditNoteDetailPayload } from "./adminInvoicesTypes"
import { mapCreditNoteMotifUi, mapInvoiceStatusUi } from "./adminInvoicesUtils"
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"

type AdminCreditNoteDetailPageProps = {
  creditNoteId: string
}

export function AdminCreditNoteDetailPage({
  creditNoteId,
}: AdminCreditNoteDetailPageProps) {
  const [payload, setPayload] = useState<AdminCreditNoteDetailPayload | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
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
        const nextPayload = await fetchAdminCreditNoteById(creditNoteId)
        setPayload(nextPayload)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le detail avoir.",
        )
      } finally {
        if (isSilent) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [creditNoteId],
  )

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  async function handleSendEmail() {
    const confirmed = await confirmCriticalAction({
      title: "Renvoyer l'avoir",
      message: "Confirmer le renvoi de cet avoir par email au client ?",
      confirmLabel: "Envoyer",
      tone: "warning",
    })

    if (!confirmed) {
      return
    }

    setIsSendingEmail(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await sendAdminCreditNoteEmail(creditNoteId)
      setNoticeMessage("Avoir renvoye par email avec succes.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de renvoyer l'avoir par email.",
      )
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-credit-note-detail-title"
      >
        <h1
          id="admin-credit-note-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Detail avoir
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement de l&apos;avoir...
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!payload) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-credit-note-detail-title"
      >
        <h1
          id="admin-credit-note-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Detail avoir
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-brand-error">
            {errorMessage || "Avoir introuvable."}
          </CardContent>
        </Card>
      </section>
    )
  }

  const { creditNote, invoice, order, client } = payload
  const motifUi = mapCreditNoteMotifUi(creditNote.motif)
  const invoiceStatusUi = invoice ? mapInvoiceStatusUi(invoice.statut) : null

  return (
    <section
      className="space-y-6"
      aria-labelledby="admin-credit-note-detail-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-credit-note-detail-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            Avoir {creditNote.numero_avoir}
          </h1>
          <p className="text-sm text-slate-600">{creditNote.id_avoir}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/avoirs">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour liste
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
            Actions avoir
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {creditNote.pdf_url ? (
            <Button asChild>
              <a href={creditNote.pdf_url} target="_blank" rel="noreferrer">
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
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Informations avoir
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Numero avoir</p>
              <p className="mt-1 font-medium text-brand-nav">
                {creditNote.numero_avoir}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Date emission</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(creditNote.date_emission)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Motif</p>
              <Badge className={`mt-1 ${motifUi.className}`}>
                {motifUi.label}
              </Badge>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Montant</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatCurrency(-Math.abs(creditNote.montant))}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Client</p>
              <p className="mt-1 font-medium text-brand-nav">
                {client?.nom_complet || "-"}
              </p>
              <p>{client?.email || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Facture liee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {invoice ? (
              <>
                <p className="font-medium text-brand-nav">
                  {invoice.numero_facture}
                </p>
                <p>Emission: {formatDate(invoice.date_emission)}</p>
                <p>Montant TTC: {formatCurrency(invoice.montant_ttc)}</p>
                {invoiceStatusUi ? (
                  <Badge className={invoiceStatusUi.className}>
                    {invoiceStatusUi.label}
                  </Badge>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/factures/${invoice.id_facture}`}>
                      Voir la facture
                    </Link>
                  </Button>
                  {invoice.pdf_url ? (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="size-3.5" aria-hidden="true" />
                        PDF facture
                      </a>
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p>Aucune facture liee.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {order ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Commande liee
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Numero commande</p>
              <Link
                href={`/admin/commandes/${order.id_commande}`}
                className="mt-1 inline-block font-medium text-brand-cta underline underline-offset-2"
              >
                {order.numero_commande}
              </Link>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Date commande</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(order.date_commande)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Statut commande</p>
              <Badge
                className={`mt-1 ${mapOrderStatusClassName(order.statut)}`}
              >
                {mapOrderStatusLabel(order.statut)}
              </Badge>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Statut paiement</p>
              <p className="mt-1 font-medium text-brand-nav">
                {order.statut_paiement}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
