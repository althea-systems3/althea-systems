import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types"

export type AdminOrderSortBy =
  | "numero_commande"
  | "date_commande"
  | "client"
  | "montant_ttc"
  | "statut"
  | "mode_paiement"
  | "statut_paiement"

export type AdminOrderSortDirection = "asc" | "desc"

export type AdminOrderStatusFilter = "all" | OrderStatus

export type AdminPaymentStatusFilter = "all" | PaymentStatus

export type AdminPaymentMethodFilter = "all" | string

export type AdminOrdersFilters = {
  searchNumero: string
  searchClientName: string
  searchClientEmail: string
  status: AdminOrderStatusFilter
  paymentStatus: AdminPaymentStatusFilter
  paymentMethod: AdminPaymentMethodFilter
  sortBy: AdminOrderSortBy
  sortDirection: AdminOrderSortDirection
  page: number
  pageSize: number
}

export type AdminOrderListItem = {
  id_commande: string
  numero_commande: string
  date_commande: string
  montant_ttc: number
  statut: OrderStatus
  statut_paiement: PaymentStatus
  mode_paiement: string | null
  paiement_dernier_4_masque: string | null
  id_utilisateur: string
  client: {
    nom_complet: string | null
    email: string | null
  } | null
}

export type AdminOrdersListPayload = {
  orders: AdminOrderListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  paymentMethods: string[]
}

export type AdminOrderDetail = {
  id_commande: string
  numero_commande: string
  date_commande: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  statut: OrderStatus
  statut_paiement: PaymentStatus
  mode_paiement: string | null
  paiement_dernier_4_masque: string | null
  date_paiement: string | null
  client: {
    nom_complet: string | null
    email: string | null
  } | null
}

export type AdminOrderLine = {
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

export type AdminOrderAddress = {
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

export type AdminOrderStatusHistoryItem = {
  id_historique: string
  statut_precedent: string
  nouveau_statut: string
  date_changement: string
  admin: {
    nom_complet: string | null
    email: string | null
  } | null
}

export type AdminOrderInvoice = {
  id_facture: string
  numero_facture: string
  date_emission: string
  montant_ttc: number
  statut: string
  pdf_url: string | null
}

export type AdminOrderDetailPayload = {
  order: AdminOrderDetail
  lines: AdminOrderLine[]
  address: AdminOrderAddress | null
  statusHistory: AdminOrderStatusHistoryItem[]
  invoice: AdminOrderInvoice | null
}
