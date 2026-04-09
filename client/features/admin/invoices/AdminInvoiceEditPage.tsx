"use client"

import { AlertCircle, ArrowLeft, Save } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/features/admin/adminUtils"
import { Link } from "@/i18n/navigation"

import {
  fetchAdminInvoiceById,
  updateAdminInvoiceById,
} from "./adminInvoicesApi"
import type { AdminInvoiceDetailPayload } from "./adminInvoicesTypes"
import { mapInvoiceStatusUi } from "./adminInvoicesUtils"

type AdminInvoiceEditPageProps = {
  invoiceId: string
}

export function AdminInvoiceEditPage({ invoiceId }: AdminInvoiceEditPageProps) {
  const [payload, setPayload] = useState<AdminInvoiceDetailPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const [statusDraft, setStatusDraft] = useState<
    "payee" | "en_attente" | "annule"
  >("en_attente")
  const [pdfUrlDraft, setPdfUrlDraft] = useState("")

  useEffect(() => {
    let isCancelled = false

    async function loadDetail() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextPayload = await fetchAdminInvoiceById(invoiceId)

        if (isCancelled) {
          return
        }

        setPayload(nextPayload)
        setStatusDraft(nextPayload.invoice.statut)
        setPdfUrlDraft(nextPayload.invoice.pdf_url ?? "")
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger la facture.",
        )
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      isCancelled = true
    }
  }, [invoiceId])

  async function handleSave() {
    if (!payload) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const nextPayload = await updateAdminInvoiceById(invoiceId, {
        statut: statusDraft,
        pdf_url: pdfUrlDraft.trim() ? pdfUrlDraft.trim() : null,
      })

      setPayload(nextPayload)
      setStatusDraft(nextPayload.invoice.statut)
      setPdfUrlDraft(nextPayload.invoice.pdf_url ?? "")
      setNoticeMessage("Facture mise a jour avec succes.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour la facture.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-4" aria-labelledby="admin-invoice-edit-title">
        <h1
          id="admin-invoice-edit-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Edition facture
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
      <section className="space-y-4" aria-labelledby="admin-invoice-edit-title">
        <h1
          id="admin-invoice-edit-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Edition facture
        </h1>

        <Card>
          <CardContent className="p-6 text-sm text-brand-error">
            {errorMessage || "Facture introuvable."}
          </CardContent>
        </Card>
      </section>
    )
  }

  const { invoice } = payload
  const statusUi = mapInvoiceStatusUi(invoice.statut)
  const canSelectCancelled =
    Boolean(invoice.creditNote) || invoice.statut === "annule"

  return (
    <section className="space-y-6" aria-labelledby="admin-invoice-edit-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-invoice-edit-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            Edition facture {invoice.numero_facture}
          </h1>
          <p className="text-sm text-slate-600">{invoice.id_facture}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/factures/${invoice.id_facture}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour detail
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/factures">Retour liste</Link>
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

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Champs non modifiables
            </CardTitle>
            <CardDescription>
              Les donnees legales et de liaison restent fixes pour garantir la
              coherence comptable.
            </CardDescription>
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
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Statut actuel</p>
              <Badge className={`mt-1 ${statusUi.className}`}>
                {statusUi.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Champs modifiables
            </CardTitle>
            <CardDescription>
              Le statut et l&apos;URL PDF peuvent etre ajustes selon les regles
              metier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Statut facture</span>
              <select
                value={statusDraft}
                onChange={(event) => {
                  setStatusDraft(
                    event.target.value as "payee" | "en_attente" | "annule",
                  )
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="payee">Payee</option>
                <option value="en_attente">En attente</option>
                <option value="annule" disabled={!canSelectCancelled}>
                  Annulee (via avoir)
                </option>
              </select>
            </label>

            {!canSelectCancelled ? (
              <p className="text-xs text-slate-500">
                Pour passer a Annulee, utilisez l&apos;action de suppression
                depuis le detail facture: un avoir sera cree automatiquement.
              </p>
            ) : null}

            <label className="space-y-1 text-sm text-slate-700">
              <span>URL PDF</span>
              <input
                type="url"
                value={pdfUrlDraft}
                onChange={(event) => {
                  setPdfUrlDraft(event.target.value)
                }}
                placeholder="https://.../facture.pdf"
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <Button
              type="button"
              onClick={() => {
                void handleSave()
              }}
              disabled={isSaving}
            >
              <Save className="size-4" aria-hidden="true" />
              {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
