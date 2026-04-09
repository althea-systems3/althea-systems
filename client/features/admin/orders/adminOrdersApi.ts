import { parseApiResponse } from "@/features/admin/adminApi"

import type {
  AdminOrderDetailPayload,
  AdminOrdersFilters,
  AdminOrdersListPayload,
} from "./adminOrdersTypes"
import { buildAdminOrdersQueryString } from "./adminOrdersUtils"

type UpdatedOrderPayload = {
  order: {
    id_commande: string
    numero_commande: string
    statut: string
    statut_paiement: string
  }
}

export async function fetchAdminOrders(
  filters: AdminOrdersFilters,
): Promise<AdminOrdersListPayload> {
  const queryString = buildAdminOrdersQueryString(filters)
  const endpoint = queryString
    ? `/api/admin/commandes?${queryString}`
    : "/api/admin/commandes"

  const response = await fetch(endpoint, { cache: "no-store" })

  return parseApiResponse<AdminOrdersListPayload>(
    response,
    "Impossible de charger les commandes.",
  )
}

export async function fetchAdminOrderById(
  orderId: string,
): Promise<AdminOrderDetailPayload> {
  const response = await fetch(`/api/admin/commandes/${orderId}`, {
    cache: "no-store",
  })

  return parseApiResponse<AdminOrderDetailPayload>(
    response,
    "Impossible de charger le detail commande.",
  )
}

export async function updateAdminOrderStatus(
  orderId: string,
  statut: "en_attente" | "en_cours" | "terminee" | "annulee",
): Promise<void> {
  const response = await fetch(`/api/admin/commandes/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ statut }),
  })

  await parseApiResponse<UpdatedOrderPayload>(
    response,
    "Impossible de mettre a jour le statut commande.",
  )
}
