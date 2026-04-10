import { adminFetch, parseApiResponse } from "@/features/admin/adminApi"

import type {
  AdminSendMailPayload,
  AdminUserDetailPayload,
  AdminUsersFilters,
  AdminUsersListPayload,
} from "./adminUsersTypes"
import { buildAdminUsersQueryString } from "./adminUsersUtils"

type SuccessPayload = {
  success: boolean
}

type UpdatedUserPayload = {
  user: {
    statut: string
  }
}

export async function fetchAdminUsers(
  filters: AdminUsersFilters,
): Promise<AdminUsersListPayload> {
  const queryString = buildAdminUsersQueryString(filters)
  const endpoint = queryString
    ? `/api/admin/utilisateurs?${queryString}`
    : "/api/admin/utilisateurs"

  const response = await adminFetch(endpoint, { cache: "no-store" })

  return parseApiResponse<AdminUsersListPayload>(
    response,
    "Impossible de charger les utilisateurs.",
  )
}

export async function fetchAdminUserById(
  userId: string,
): Promise<AdminUserDetailPayload> {
  const response = await adminFetch(`/api/admin/utilisateurs/${userId}`, {
    cache: "no-store",
  })

  return parseApiResponse<AdminUserDetailPayload>(
    response,
    "Impossible de charger le detail utilisateur.",
  )
}

export async function updateAdminUserStatus(
  userId: string,
  statut: "actif" | "inactif" | "en_attente",
): Promise<void> {
  const response = await adminFetch(`/api/admin/utilisateurs/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ statut }),
  })

  await parseApiResponse<UpdatedUserPayload>(
    response,
    "Impossible de mettre a jour le statut utilisateur.",
  )
}

export async function sendAdminUserMail(
  userId: string,
  payload: AdminSendMailPayload,
): Promise<void> {
  const response = await adminFetch(`/api/admin/utilisateurs/${userId}/mail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  await parseApiResponse<SuccessPayload>(
    response,
    "Impossible d envoyer le mail administrateur.",
  )
}

export async function resetAdminUserPassword(userId: string): Promise<void> {
  const response = await adminFetch(
    `/api/admin/utilisateurs/${userId}/reset-password`,
    {
      method: "POST",
    },
  )

  await parseApiResponse<SuccessPayload>(
    response,
    "Impossible de declencher la reinitialisation du mot de passe.",
  )
}

export async function deleteAdminUserWithRgpd(
  userId: string,
  confirmationText: string,
): Promise<void> {
  const response = await adminFetch(`/api/admin/utilisateurs/${userId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      acknowledgeRgpd: true,
      confirmationText,
    }),
  })

  await parseApiResponse<SuccessPayload>(
    response,
    "Impossible de lancer la suppression RGPD de ce compte.",
  )
}
