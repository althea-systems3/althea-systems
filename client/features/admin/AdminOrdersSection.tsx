"use client"

import { AlertCircle, Eye, RefreshCw } from "lucide-react"
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { parseApiResponse } from "@/features/admin/adminApi"
import {
  formatCurrency,
  formatDate,
  mapOrderStatusClassName,
  mapOrderStatusLabel,
} from "@/features/admin/adminUtils"
import { cn } from "@/lib/utils"

type OrderStatus = "en_attente" | "en_cours" | "terminee" | "annulee"
type OrderFilterStatus = "all" | OrderStatus
type OrderSort = "desc" | "asc"

type AdminOrder = {
  id_commande: string
  numero_commande: string
  date_commande: string
  montant_ttc: number
  statut: OrderStatus
  id_utilisateur: string
  utilisateur: {
    nom_complet: string | null
    email: string | null
  } | null
}

type OrdersPayload = {
  orders: AdminOrder[]
}

type OrderLine = {
  id_ligne: string
  id_produit: string
  quantite: number
  prix_unitaire_ht: number
  prix_total_ttc: number
  produit: {
    nom: string | null
    slug: string | null
  } | null
}

type OrderAddress = {
  id_adresse: string
  prenom: string | null
  nom: string | null
  adresse_1: string | null
  adresse_2: string | null
  ville: string | null
  region: string | null
  code_postal: string | null
  pays: string | null
  telephone: string | null
}

type OrderDetailPayload = {
  order: {
    id_commande: string
    numero_commande: string
    date_commande: string
    montant_ht: number
    montant_tva: number
    montant_ttc: number
    statut: OrderStatus
    statut_paiement: string | null
    mode_paiement: string | null
    paiement_dernier_4: string | null
    utilisateur: {
      nom_complet: string | null
      email: string | null
    } | null
  }
  lines: OrderLine[]
  address: OrderAddress | null
}

type OrderFilters = {
  search: string
  status: OrderFilterStatus
  sort: OrderSort
}

const INITIAL_FILTERS: OrderFilters = {
  search: "",
  status: "all",
  sort: "desc",
}

function getOrdersQueryString(filters: OrderFilters): string {
  const searchParams = new URLSearchParams()

  if (filters.search.trim()) {
    searchParams.set("search", filters.search.trim())
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status)
  }

  searchParams.set("sort", filters.sort)

  return searchParams.toString()
}

export function AdminOrdersSection() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const [filters, setFilters] = useState<OrderFilters>(INITIAL_FILTERS)
  const [searchInput, setSearchInput] = useState("")
  const [statusInput, setStatusInput] = useState<OrderFilterStatus>("all")
  const [sortInput, setSortInput] = useState<OrderSort>("desc")

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [orderDetail, setOrderDetail] = useState<OrderDetailPayload | null>(
    null,
  )
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const queryString = getOrdersQueryString(filters)
      const response = await fetch(`/api/admin/commandes?${queryString}`, {
        cache: "no-store",
      })

      const payload = await parseApiResponse<OrdersPayload>(
        response,
        "Impossible de charger les commandes.",
      )

      setOrders(payload.orders)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les commandes.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const handleApplyFilters = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    setNoticeMessage(null)
    setFilters({
      search: searchInput,
      status: statusInput,
      sort: sortInput,
    })
  }

  const handleResetFilters = () => {
    setSearchInput("")
    setStatusInput("all")
    setSortInput("desc")
    setFilters(INITIAL_FILTERS)
  }

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    setErrorMessage(null)
    setNoticeMessage(null)
    setUpdatingOrderId(orderId)

    try {
      const response = await fetch(`/api/admin/commandes/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statut: status }),
      })

      await parseApiResponse<{
        order: { id_commande: string; statut: OrderStatus }
      }>(response, "Impossible de mettre a jour le statut.")

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id_commande === orderId ? { ...order, statut: status } : order,
        ),
      )

      setOrderDetail((previousDetail) => {
        if (!previousDetail || previousDetail.order.id_commande !== orderId) {
          return previousDetail
        }

        return {
          ...previousDetail,
          order: {
            ...previousDetail.order,
            statut: status,
          },
        }
      })

      setNoticeMessage("Statut de commande mis a jour.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour le statut.",
      )
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleOpenOrderDetail = async (orderId: string) => {
    setSelectedOrderId(orderId)
    setOrderDetail(null)
    setIsDetailLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/commandes/${orderId}`, {
        cache: "no-store",
      })

      const payload = await parseApiResponse<OrderDetailPayload>(
        response,
        "Impossible de charger le detail de la commande.",
      )

      setOrderDetail(payload)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le detail de la commande.",
      )
    } finally {
      setIsDetailLoading(false)
    }
  }

  const selectedOrderSummary = useMemo(() => {
    if (!selectedOrderId) {
      return null
    }

    return orders.find((order) => order.id_commande === selectedOrderId) ?? null
  }, [orders, selectedOrderId])

  return (
    <section className="space-y-6" aria-labelledby="admin-orders-title">
      <header className="space-y-1">
        <h1
          id="admin-orders-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Gestion des commandes
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Suivez les commandes et mettez a jour leur statut de traitement.
        </p>
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
          <CardTitle className="text-xl">Filtres commandes</CardTitle>
          <CardDescription>
            Recherchez une commande et filtrez par statut ou ordre
            chronologique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"
            onSubmit={handleApplyFilters}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Numero commande</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Ex: CMD-2025-001"
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Statut</span>
              <select
                value={statusInput}
                onChange={(event) =>
                  setStatusInput(event.target.value as OrderFilterStatus)
                }
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminee</option>
                <option value="annulee">Annulee</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Tri</span>
              <select
                value={sortInput}
                onChange={(event) =>
                  setSortInput(event.target.value as OrderSort)
                }
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="desc">Plus recentes</option>
                <option value="asc">Plus anciennes</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <Button type="submit" className="w-full md:w-auto">
                Filtrer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="w-full md:w-auto"
              >
                Reinit.
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Commandes</CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement des commandes..."
              : `${orders.length} commande(s) trouvee(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">Commande</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Client</th>
                  <th className="px-2 py-3">Montant</th>
                  <th className="px-2 py-3">Statut</th>
                  <th className="px-2 py-3">Mise a jour</th>
                  <th className="px-2 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && orders.length === 0 ? (
                  <tr>
                    <td className="px-2 py-6 text-slate-500" colSpan={7}>
                      Aucune commande ne correspond aux filtres appliques.
                    </td>
                  </tr>
                ) : null}

                {orders.map((order) => (
                  <tr
                    key={order.id_commande}
                    className="border-b border-border/60"
                  >
                    <td className="px-2 py-3 align-top">
                      <p className="font-medium text-brand-nav">
                        {order.numero_commande}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.id_commande}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      {formatDate(order.date_commande)}
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      <p>{order.utilisateur?.nom_complet ?? "-"}</p>
                      <p className="text-xs text-slate-500">
                        {order.utilisateur?.email ?? "-"}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      {formatCurrency(order.montant_ttc)}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <Badge
                        className={cn(
                          "border-transparent",
                          mapOrderStatusClassName(order.statut),
                        )}
                      >
                        {mapOrderStatusLabel(order.statut)}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <select
                        aria-label={`Changer statut ${order.numero_commande}`}
                        value={order.statut}
                        disabled={updatingOrderId === order.id_commande}
                        onChange={(event) =>
                          void handleStatusUpdate(
                            order.id_commande,
                            event.target.value as OrderStatus,
                          )
                        }
                        className="h-9 w-full rounded-md border border-border px-2 text-sm"
                      >
                        <option value="en_attente">En attente</option>
                        <option value="en_cours">En cours</option>
                        <option value="terminee">Terminee</option>
                        <option value="annulee">Annulee</option>
                      </select>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void handleOpenOrderDetail(order.id_commande)
                        }
                      >
                        <Eye className="size-3.5" aria-hidden="true" />
                        Ouvrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedOrderId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Detail commande{" "}
              {selectedOrderSummary?.numero_commande ?? selectedOrderId}
            </CardTitle>
            <CardDescription>
              Informations client, lignes de commande et adresse de livraison.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDetailLoading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : null}

            {!isDetailLoading && orderDetail ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-slate-500">Statut</p>
                    <p className="text-sm font-medium text-brand-nav">
                      {mapOrderStatusLabel(orderDetail.order.statut)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-slate-500">Montant HT</p>
                    <p className="text-sm font-medium text-brand-nav">
                      {formatCurrency(orderDetail.order.montant_ht)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-slate-500">TVA</p>
                    <p className="text-sm font-medium text-brand-nav">
                      {formatCurrency(orderDetail.order.montant_tva)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-slate-500">Total TTC</p>
                    <p className="text-sm font-medium text-brand-nav">
                      {formatCurrency(orderDetail.order.montant_ttc)}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium text-brand-nav">Paiement</p>
                  <p className="mt-1 text-slate-700">
                    Statut: {orderDetail.order.statut_paiement ?? "-"}
                  </p>
                  <p className="text-slate-700">
                    Methode: {orderDetail.order.mode_paiement ?? "-"}
                  </p>
                  <p className="text-slate-700">
                    Derniers 4: {orderDetail.order.paiement_dernier_4 ?? "-"}
                  </p>
                </div>

                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium text-brand-nav">
                    Adresse livraison
                  </p>
                  {orderDetail.address ? (
                    <div className="mt-1 space-y-1 text-slate-700">
                      <p>
                        {orderDetail.address.prenom ?? ""}{" "}
                        {orderDetail.address.nom ?? ""}
                      </p>
                      <p>{orderDetail.address.adresse_1 ?? ""}</p>
                      {orderDetail.address.adresse_2 ? (
                        <p>{orderDetail.address.adresse_2}</p>
                      ) : null}
                      <p>
                        {orderDetail.address.code_postal ?? ""}{" "}
                        {orderDetail.address.ville ?? ""}
                      </p>
                      <p>{orderDetail.address.pays ?? ""}</p>
                      <p>{orderDetail.address.telephone ?? ""}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-600">
                      Aucune adresse associee.
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="min-w-[680px] w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Produit</th>
                        <th className="px-3 py-2">Quantite</th>
                        <th className="px-3 py-2">Prix HT</th>
                        <th className="px-3 py-2">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetail.lines.map((line) => (
                        <tr
                          key={line.id_ligne}
                          className="border-b border-border/60"
                        >
                          <td className="px-3 py-2">
                            <p className="font-medium text-brand-nav">
                              {line.produit?.nom ?? line.id_produit}
                            </p>
                            <p className="text-xs text-slate-500">
                              {line.produit?.slug ?? "-"}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {line.quantite}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatCurrency(line.prix_unitaire_ht)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatCurrency(line.prix_total_ttc)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {!isDetailLoading && !orderDetail ? (
              <p className="text-sm text-slate-600">Aucun detail a afficher.</p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedOrderId(null)
                setOrderDetail(null)
              }}
            >
              Fermer le detail
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadOrders()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Rafraichir la liste
        </Button>
      </div>
    </section>
  )
}
