"use client"

import { AlertCircle, ArrowLeft, Pencil } from "lucide-react"
import { useEffect, useState } from "react"

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

import { fetchAdminUserById } from "./adminUsersApi"
import type { AdminUserDetailPayload } from "./adminUsersTypes"
import { mapUserStatusUi } from "./adminUsersUtils"

type AdminUserDetailPageProps = {
  userId: string
}

export function AdminUserDetailPage({ userId }: AdminUserDetailPageProps) {
  const [payload, setPayload] = useState<AdminUserDetailPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadDetail() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextPayload = await fetchAdminUserById(userId)

        if (isCancelled) {
          return
        }

        setPayload(nextPayload)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le détail utilisateur.",
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
  }, [userId])

  if (isLoading) {
    return (
      <section className="space-y-4" aria-labelledby="admin-user-detail-title">
        <h1
          id="admin-user-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Détail utilisateur
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement de la fiche utilisateur...
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!payload) {
    return (
      <section className="space-y-4" aria-labelledby="admin-user-detail-title">
        <h1
          id="admin-user-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Détail utilisateur
        </h1>

        <Card>
          <CardContent className="p-6 text-sm text-brand-error">
            {errorMessage || "Utilisateur introuvable."}
          </CardContent>
        </Card>
      </section>
    )
  }

  const { user, addresses, paymentMethods, orders, summary } = payload
  const statusUi = mapUserStatusUi(user.statut)

  return (
    <section className="space-y-6" aria-labelledby="admin-user-detail-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-user-detail-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            {user.nom_complet || "Utilisateur"}
          </h1>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/utilisateurs">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour liste
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/utilisateurs/${user.id_utilisateur}/edition`}>
              <Pencil className="size-4" aria-hidden="true" />
              Actions admin
            </Link>
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

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Informations du compte
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Statut</p>
              <Badge className={`mt-1 ${statusUi.className}`}>
                {statusUi.label}
              </Badge>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Email vérifié</p>
              <p className="mt-1 font-medium text-brand-nav">
                {user.email_verifie ? "Oui" : "Non"}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Rôle</p>
              <p className="mt-1 font-medium text-brand-nav">
                {user.est_admin ? "Administrateur" : "Client"}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Date inscription</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(user.date_inscription)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Dernière connexion</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(user.derniere_connexion)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Validation email</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(user.date_validation_email)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">CGU acceptées</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(user.cgu_acceptee_le)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Résumé activité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Nombre de commandes</p>
              <p className="mt-1 text-lg font-semibold text-brand-nav">
                {summary.nombre_commandes}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">
                Chiffre d&apos;affaires total
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-nav">
                {formatCurrency(summary.chiffre_affaires_total)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Adresses facturation</p>
              <p className="mt-1 text-lg font-semibold text-brand-nav">
                {addresses.length}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-slate-500">Moyens de paiement</p>
              <p className="mt-1 text-lg font-semibold text-brand-nav">
                {paymentMethods.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Adresses de facturation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {addresses.length === 0 ? (
              <p className="text-sm text-slate-600">
                Aucune adresse enregistrée.
              </p>
            ) : (
              addresses.map((address) => (
                <article
                  key={address.id_adresse}
                  className="rounded-md border border-border bg-slate-50 p-3 text-sm text-slate-700"
                >
                  <p className="font-medium text-brand-nav">
                    {(address.prenom || "").trim()} {(address.nom || "").trim()}
                  </p>
                  <p>{address.adresse_1 || "-"}</p>
                  {address.adresse_2 ? <p>{address.adresse_2}</p> : null}
                  <p>
                    {address.code_postal || "-"} {address.ville || "-"}
                  </p>
                  <p>{address.pays || "-"}</p>
                  {address.telephone ? <p>{address.telephone}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Utilisée dans {address.utilisation_commandes} commande(s)
                  </p>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Moyens de paiement (masqués)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun moyen de paiement.</p>
            ) : (
              paymentMethods.map((paymentMethod) => (
                <article
                  key={paymentMethod.id_paiement}
                  className="rounded-md border border-border bg-slate-50 p-3 text-sm text-slate-700"
                >
                  <p className="font-medium text-brand-nav">
                    {paymentMethod.nom_carte || "Carte"}
                  </p>
                  <p>{paymentMethod.carte_masquee}</p>
                  <p>
                    Exp: {paymentMethod.date_expiration || "--/--"}
                    {paymentMethod.est_defaut ? " · Carte par défaut" : ""}
                  </p>
                  {paymentMethod.stripe_payment_id_masque ? (
                    <p className="text-xs text-slate-500">
                      {paymentMethod.stripe_payment_id_masque}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Commandes associées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">N° commande</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Statut commande</th>
                  <th className="px-2 py-3">Statut paiement</th>
                  <th className="px-2 py-3">Montant TTC</th>
                  <th className="px-2 py-3">Paiement</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-slate-500">
                      Aucune commande pour ce compte.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id_commande}
                      className="border-b border-border/60"
                    >
                      <td className="px-2 py-3 text-brand-nav">
                        {order.numero_commande}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatDate(order.date_commande)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          className={mapOrderStatusClassName(order.statut)}
                        >
                          {mapOrderStatusLabel(order.statut)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {order.statut_paiement}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatCurrency(Number(order.montant_ttc) || 0)}
                      </td>
                      <td className="px-2 py-3 text-xs text-slate-700">
                        {order.mode_paiement || "-"}
                        {order.paiement_dernier_4
                          ? ` · **** ${order.paiement_dernier_4}`
                          : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
