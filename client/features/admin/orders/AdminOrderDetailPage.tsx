"use client"

import { AlertCircle, ArrowLeft, FileDown, RefreshCw } from "lucide-react"
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
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"

import { fetchAdminOrderById, updateAdminOrderStatus } from "./adminOrdersApi"
import type {
  AdminOrderDetailPayload,
  AdminOrderStatusHistoryItem,
} from "./adminOrdersTypes"
import { mapPaymentMethodLabel, mapPaymentStatusUi } from "./adminOrdersUtils"

type AdminOrderDetailPageProps = {
  orderId: string
}

function formatHistoryActor(historyEntry: AdminOrderStatusHistoryItem): string {
  if (!historyEntry.admin) {
    return "Systeme"
  }

  if (historyEntry.admin.nom_complet?.trim()) {
    return historyEntry.admin.nom_complet
  }

  if (historyEntry.admin.email?.trim()) {
    return historyEntry.admin.email
  }

  return "Admin"
}

export function AdminOrderDetailPage({ orderId }: AdminOrderDetailPageProps) {
  const [payload, setPayload] = useState<AdminOrderDetailPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusDraft, setStatusDraft] = useState<
    "en_attente" | "en_cours" | "terminee" | "annulee"
  >("en_attente")
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
        const nextPayload = await fetchAdminOrderById(orderId)
        setPayload(nextPayload)
        setStatusDraft(nextPayload.order.statut)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le detail commande.",
        )
      } finally {
        if (isSilent) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [orderId],
  )

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  async function handleStatusUpdate() {
    if (!payload) {
      return
    }

    if (statusDraft === payload.order.statut) {
      setNoticeMessage("Le statut selectionne est deja le statut actuel.")
      return
    }

    const confirmed = await confirmCriticalAction({
      title: "Confirmer le changement de statut",
      message: "Confirmer la modification du statut de cette commande ?",
      confirmLabel: "Confirmer",
      tone: "warning",
    })

    if (!confirmed) {
      return
    }

    setIsUpdatingStatus(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await updateAdminOrderStatus(orderId, statusDraft)
      setNoticeMessage("Statut commande mis a jour avec succes.")
      await loadDetail({ silent: true })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour le statut commande.",
      )
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-4" aria-labelledby="admin-order-detail-title">
        <h1
          id="admin-order-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Detail commande
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement de la commande...
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!payload) {
    return (
      <section className="space-y-4" aria-labelledby="admin-order-detail-title">
        <h1
          id="admin-order-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Detail commande
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-brand-error">
            {errorMessage || "Commande introuvable."}
          </CardContent>
        </Card>
      </section>
    )
  }

  const { order, lines, address, statusHistory, invoice } = payload
  const paymentStatusUi = mapPaymentStatusUi(order.statut_paiement)

  return (
    <section className="space-y-6" aria-labelledby="admin-order-detail-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-order-detail-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            Commande {order.numero_commande}
          </h1>
          <p className="text-sm text-slate-600">{order.id_commande}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/commandes">
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

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Informations commande
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Numero</p>
              <p className="mt-1 font-medium text-brand-nav">
                {order.numero_commande}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Date et heure</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(order.date_commande)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Statut commande</p>
              <Badge
                className={`mt-1 border-transparent ${mapOrderStatusClassName(
                  order.statut,
                )}`}
              >
                {mapOrderStatusLabel(order.statut)}
              </Badge>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Montant HT</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatCurrency(order.montant_ht)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">TVA</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatCurrency(order.montant_tva)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Montant TTC</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatCurrency(order.montant_ttc)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Action statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Nouveau statut</span>
              <select
                value={statusDraft}
                onChange={(event) => {
                  setStatusDraft(
                    event.target.value as
                      | "en_attente"
                      | "en_cours"
                      | "terminee"
                      | "annulee",
                  )
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminee</option>
                <option value="annulee">Annulee</option>
              </select>
            </label>
            <Button
              type="button"
              onClick={() => {
                void handleStatusUpdate()
              }}
              disabled={isUpdatingStatus}
              className="w-full"
            >
              {isUpdatingStatus ? "Mise a jour..." : "Mettre a jour le statut"}
            </Button>
            <p className="text-xs text-slate-500">
              Confirmation systematique avant changement de statut.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Informations paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span>Statut paiement</span>
              <Badge className={paymentStatusUi.className}>
                {paymentStatusUi.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span>Mode paiement</span>
              <span className="font-medium text-brand-nav">
                {mapPaymentMethodLabel(order.mode_paiement)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span>Date paiement</span>
              <span className="font-medium text-brand-nav">
                {formatDate(order.date_paiement)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span>Carte (masquee)</span>
              <span className="font-medium text-brand-nav">
                {order.paiement_dernier_4_masque || "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Client et adresse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Client</p>
              <p className="mt-1 font-medium text-brand-nav">
                {order.client?.nom_complet || "-"}
              </p>
              <p>{order.client?.email || "-"}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Adresse associee</p>
              {address ? (
                <div className="mt-1 space-y-1">
                  <p className="font-medium text-brand-nav">
                    {address.prenom || ""} {address.nom || ""}
                  </p>
                  <p>{address.adresse_1 || "-"}</p>
                  {address.adresse_2 ? <p>{address.adresse_2}</p> : null}
                  <p>
                    {address.code_postal || "-"} {address.ville || "-"}
                  </p>
                  <p>{address.pays || "-"}</p>
                  {address.telephone ? <p>{address.telephone}</p> : null}
                </div>
              ) : (
                <p className="mt-1 text-slate-600">Aucune adresse associee.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Historique statuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">Ancien statut</th>
                  <th className="px-2 py-3">Nouveau statut</th>
                  <th className="px-2 py-3">Date changement</th>
                  <th className="px-2 py-3">Utilisateur</th>
                </tr>
              </thead>
              <tbody>
                {statusHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-slate-500">
                      Aucun historique disponible.
                    </td>
                  </tr>
                ) : (
                  statusHistory.map((historyEntry) => (
                    <tr
                      key={historyEntry.id_historique}
                      className="border-b border-border/60"
                    >
                      <td className="px-2 py-3">
                        {mapOrderStatusLabel(historyEntry.statut_precedent)}
                      </td>
                      <td className="px-2 py-3">
                        {mapOrderStatusLabel(historyEntry.nouveau_statut)}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatDate(historyEntry.date_changement)}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatHistoryActor(historyEntry)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Lignes commande
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">Produit</th>
                  <th className="px-2 py-3">Quantite</th>
                  <th className="px-2 py-3">Prix unitaire HT</th>
                  <th className="px-2 py-3">Total ligne TTC</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-slate-500">
                      Aucune ligne commande disponible.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr
                      key={line.id_ligne}
                      className="border-b border-border/60"
                    >
                      <td className="px-2 py-3">
                        <p className="font-medium text-brand-nav">
                          {line.produit?.nom || line.id_produit}
                        </p>
                        <p className="text-xs text-slate-500">
                          {line.produit?.slug || "-"}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {line.quantite}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatCurrency(line.prix_unitaire_ht)}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatCurrency(line.prix_total_ttc)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Facture associee
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {invoice ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Numero facture</p>
                  <p className="mt-1 font-medium text-brand-nav">
                    {invoice.numero_facture}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Date emission</p>
                  <p className="mt-1 font-medium text-brand-nav">
                    {formatDate(invoice.date_emission)}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Montant TTC</p>
                  <p className="mt-1 font-medium text-brand-nav">
                    {formatCurrency(invoice.montant_ttc)}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-500">Statut facture</p>
                  <p className="mt-1 font-medium text-brand-nav">
                    {invoice.statut}
                  </p>
                </div>
              </div>

              {invoice.pdf_url ? (
                <Button asChild>
                  <a href={invoice.pdf_url} target="_blank" rel="noreferrer">
                    <FileDown className="size-4" aria-hidden="true" />
                    Telecharger PDF facture
                  </a>
                </Button>
              ) : (
                <p className="text-slate-600">
                  PDF facture indisponible pour cette commande.
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-600">Aucune facture associee.</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
