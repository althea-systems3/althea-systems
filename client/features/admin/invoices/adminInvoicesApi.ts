import { parseApiResponse } from "@/features/admin/adminApi"

import type {
  AdminCreditNoteDetailPayload,
  AdminCreditNotesFilters,
  AdminCreditNotesListPayload,
  AdminInvoiceDeletePayload,
  AdminInvoiceDetailPayload,
  AdminInvoiceUpdatePayload,
  AdminInvoicesFilters,
  AdminInvoicesListPayload,
} from "./adminInvoicesTypes"
import {
  buildAdminCreditNotesQueryString,
  buildAdminInvoicesQueryString,
} from "./adminInvoicesUtils"

type SuccessPayload = {
  success: boolean
}

export async function fetchAdminInvoices(
  filters: AdminInvoicesFilters,
): Promise<AdminInvoicesListPayload> {
  const queryString = buildAdminInvoicesQueryString(filters)
  const endpoint = queryString
    ? `/api/admin/invoices?${queryString}`
    : "/api/admin/invoices"

  const response = await fetch(endpoint, { cache: "no-store" })

  return parseApiResponse<AdminInvoicesListPayload>(
    response,
    "Impossible de charger les factures.",
  )
}

export async function fetchAdminInvoiceById(
  invoiceId: string,
): Promise<AdminInvoiceDetailPayload> {
  const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
    cache: "no-store",
  })

  return parseApiResponse<AdminInvoiceDetailPayload>(
    response,
    "Impossible de charger le detail facture.",
  )
}

export async function updateAdminInvoiceById(
  invoiceId: string,
  payload: AdminInvoiceUpdatePayload,
): Promise<AdminInvoiceDetailPayload> {
  const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return parseApiResponse<AdminInvoiceDetailPayload>(
    response,
    "Impossible de mettre a jour la facture.",
  )
}

export async function deleteAdminInvoiceById(
  invoiceId: string,
): Promise<AdminInvoiceDeletePayload> {
  const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
    method: "DELETE",
  })

  return parseApiResponse<AdminInvoiceDeletePayload>(
    response,
    "Impossible de supprimer la facture.",
  )
}

export async function sendAdminInvoiceEmail(invoiceId: string): Promise<void> {
  const response = await fetch(`/api/admin/invoices/${invoiceId}/email`, {
    method: "POST",
  })

  await parseApiResponse<SuccessPayload>(
    response,
    "Impossible de renvoyer la facture par email.",
  )
}

export async function fetchAdminCreditNotes(
  filters: AdminCreditNotesFilters,
): Promise<AdminCreditNotesListPayload> {
  const queryString = buildAdminCreditNotesQueryString(filters)
  const endpoint = queryString
    ? `/api/admin/avoirs?${queryString}`
    : "/api/admin/avoirs"

  const response = await fetch(endpoint, { cache: "no-store" })

  return parseApiResponse<AdminCreditNotesListPayload>(
    response,
    "Impossible de charger les avoirs.",
  )
}

export async function fetchAdminCreditNoteById(
  creditNoteId: string,
): Promise<AdminCreditNoteDetailPayload> {
  const response = await fetch(`/api/admin/avoirs/${creditNoteId}`, {
    cache: "no-store",
  })

  return parseApiResponse<AdminCreditNoteDetailPayload>(
    response,
    "Impossible de charger le detail avoir.",
  )
}

export async function sendAdminCreditNoteEmail(
  creditNoteId: string,
): Promise<void> {
  const response = await fetch(`/api/admin/avoirs/${creditNoteId}/email`, {
    method: "POST",
  })

  await parseApiResponse<SuccessPayload>(
    response,
    "Impossible de renvoyer l'avoir par email.",
  )
}
