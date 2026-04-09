import type {
  CreditNoteReason,
  InvoiceStatus,
  PaymentStatus,
} from "@/lib/supabase/types"

export type AdminInvoicesSortBy =
  | "numero_facture"
  | "date_emission"
  | "client"
  | "montant_ttc"
  | "statut"

export type AdminCreditNotesSortBy =
  | "numero_avoir"
  | "date_emission"
  | "client"
  | "montant"
  | "motif"

export type AdminSortDirection = "asc" | "desc"

export type AdminInvoiceStatusFilter = "all" | InvoiceStatus

export type AdminCreditNoteReasonFilter = "all" | CreditNoteReason

export type AdminInvoicesFilters = {
  searchNumero: string
  searchClient: string
  status: AdminInvoiceStatusFilter
  dateFrom: string
  dateTo: string
  sortBy: AdminInvoicesSortBy
  sortDirection: AdminSortDirection
  page: number
  pageSize: number
}

export type AdminCreditNotesFilters = {
  searchNumero: string
  searchClient: string
  motif: AdminCreditNoteReasonFilter
  dateFrom: string
  dateTo: string
  sortBy: AdminCreditNotesSortBy
  sortDirection: AdminSortDirection
  page: number
  pageSize: number
}

export type AdminInvoiceListItem = {
  id_facture: string
  numero_facture: string
  id_commande: string
  date_emission: string
  montant_ttc: number
  statut: InvoiceStatus
  pdf_url: string | null
  commande: {
    id_commande: string
    numero_commande: string
  } | null
  client: {
    id_utilisateur: string
    nom_complet: string | null
    email: string | null
  } | null
}

export type AdminInvoicesListPayload = {
  invoices: AdminInvoiceListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type AdminInvoiceDetail = {
  id_facture: string
  numero_facture: string
  date_emission: string
  montant_ttc: number
  statut: InvoiceStatus
  pdf_url: string | null
  commande: {
    id_commande: string
    numero_commande: string
    date_commande: string
    statut: string
    statut_paiement: PaymentStatus | string
  } | null
  client: {
    id_utilisateur: string
    nom_complet: string | null
    email: string | null
  } | null
  creditNote: {
    id_avoir: string
    numero_avoir: string
    date_emission: string
    montant: number
    motif: CreditNoteReason
    pdf_url: string | null
  } | null
}

export type AdminInvoiceHistoryItem = {
  type: string
  label: string
  date: string
}

export type AdminInvoiceDetailPayload = {
  invoice: AdminInvoiceDetail
  history: AdminInvoiceHistoryItem[]
}

export type AdminInvoiceUpdatePayload = {
  statut?: InvoiceStatus
  pdf_url?: string | null
}

export type AdminInvoiceDeletePayload = {
  message: string
  creditNote: {
    number: string
    amount: number
    pdfUrl: string | null
  }
}

export type AdminCreditNoteListItem = {
  id_avoir: string
  numero_avoir: string
  date_emission: string
  montant: number
  motif: CreditNoteReason
  pdf_url: string | null
  facture: {
    id_facture: string
    numero_facture: string
  } | null
  commande: {
    id_commande: string
    numero_commande: string
  } | null
  client: {
    id_utilisateur: string
    nom_complet: string | null
    email: string | null
  } | null
}

export type AdminCreditNotesListPayload = {
  creditNotes: AdminCreditNoteListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type AdminCreditNoteDetailPayload = {
  creditNote: {
    id_avoir: string
    numero_avoir: string
    date_emission: string
    montant: number
    motif: CreditNoteReason
    pdf_url: string | null
  }
  invoice: {
    id_facture: string
    numero_facture: string
    date_emission: string
    montant_ttc: number
    statut: InvoiceStatus
    pdf_url: string | null
  } | null
  order: {
    id_commande: string
    numero_commande: string
    date_commande: string
    statut: string
    statut_paiement: PaymentStatus | string
  } | null
  client: {
    id_utilisateur: string
    nom_complet: string | null
    email: string | null
  } | null
}
