import type { UserStatus } from "@/lib/supabase/types"

export type AdminUserStatusFilter = "all" | UserStatus

export type AdminUserSortBy =
  | "nom"
  | "date_inscription"
  | "nombre_commandes"
  | "ca_total"
  | "derniere_connexion"

export type AdminUserSortDirection = "asc" | "desc"

export type AdminUsersFilters = {
  searchName: string
  searchEmail: string
  status: AdminUserStatusFilter
  sortBy: AdminUserSortBy
  sortDirection: AdminUserSortDirection
  page: number
  pageSize: number
}

export type AdminUserListItem = {
  id_utilisateur: string
  email: string
  nom_complet: string
  est_admin: boolean
  statut: UserStatus
  email_verifie: boolean
  date_inscription: string
  nombre_commandes: number
  chiffre_affaires_total: number
  derniere_connexion: string | null
  adresses_facturation: string[]
  adresses_facturation_count: number
}

export type AdminUsersListPayload = {
  users: AdminUserListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type AdminUserAddress = {
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
  utilisation_commandes: number
}

export type AdminUserPaymentMethod = {
  id_paiement: string
  nom_carte: string | null
  derniers_4_chiffres: string | null
  date_expiration: string | null
  stripe_payment_id: string | null
  est_defaut: boolean | null
  carte_masquee: string
  stripe_payment_id_masque: string | null
}

export type AdminUserOrder = {
  id_commande: string
  numero_commande: string
  id_adresse: string
  date_commande: string
  montant_ttc: number | string
  statut: string
  statut_paiement: string
  mode_paiement: string | null
  paiement_dernier_4: string | null
}

export type AdminUserDetail = {
  id_utilisateur: string
  email: string
  nom_complet: string
  est_admin: boolean
  statut: UserStatus
  email_verifie: boolean
  date_inscription: string | null
  cgu_acceptee_le: string | null
  date_validation_email: string | null
  derniere_connexion: string | null
}

export type AdminUserSummary = {
  nombre_commandes: number
  chiffre_affaires_total: number
}

export type AdminUserDetailPayload = {
  user: AdminUserDetail
  addresses: AdminUserAddress[]
  paymentMethods: AdminUserPaymentMethod[]
  orders: AdminUserOrder[]
  summary: AdminUserSummary
}

export type AdminSendMailPayload = {
  subject: string
  content: string
}
