import { NextRequest, NextResponse } from "next/server"

import { normalizeString } from "@/lib/admin/common"
import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CreditNoteReason } from "@/lib/supabase/types"

type CreditNoteSortBy =
  | "numero_avoir"
  | "date_emission"
  | "client"
  | "montant"
  | "motif"

type SortDirection = "asc" | "desc"

type CreditNoteReasonFilter = "all" | CreditNoteReason

type CreditNotesListFilters = {
  searchNumero: string
  searchClient: string
  motif: CreditNoteReasonFilter
  dateFrom: string | null
  dateTo: string | null
  sortBy: CreditNoteSortBy
  sortDirection: SortDirection
  page: number
  pageSize: number
}

type CreditNoteRow = {
  id_avoir: string
  numero_avoir: string
  id_facture: string
  date_emission: string
  montant: number | string
  motif: CreditNoteReason
  pdf_url: string | null
}

type InvoiceRow = {
  id_facture: string
  numero_facture: string
  id_commande: string
}

type OrderRow = {
  id_commande: string
  numero_commande: string
  id_utilisateur: string
}

type UserRow = {
  id_utilisateur: string
  nom_complet: string | null
  email: string | null
}

type IdRow = {
  id_utilisateur?: string
  id_commande?: string
  id_facture?: string
}

type CreditNoteListItem = {
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

type FilterableCreditNotesQuery = {
  ilike: (column: string, pattern: string) => unknown
  eq: (column: string, value: string) => unknown
  gte: (column: string, value: string) => unknown
  lte: (column: string, value: string) => unknown
  in: (column: string, values: string[]) => unknown
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const IN_QUERY_CHUNK_SIZE = 100
const MAX_MATCHED_USERS = 5000
const MAX_MATCHED_ORDERS = 10000
const MAX_MATCHED_INVOICES = 10000

function splitArrayIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

function parsePage(value: string | null): number {
  const parsedValue = Number.parseInt(value ?? "", 10)

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return DEFAULT_PAGE
  }

  return parsedValue
}

function parsePageSize(value: string | null): number {
  const parsedValue = Number.parseInt(value ?? "", 10)

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return DEFAULT_PAGE_SIZE
  }

  return Math.min(parsedValue, MAX_PAGE_SIZE)
}

function parseMotif(value: string | null): CreditNoteReasonFilter {
  if (
    value === "annulation" ||
    value === "remboursement" ||
    value === "erreur"
  ) {
    return value
  }

  return "all"
}

function parseSortBy(value: string | null): CreditNoteSortBy {
  if (
    value === "numero_avoir" ||
    value === "date_emission" ||
    value === "client" ||
    value === "montant" ||
    value === "motif"
  ) {
    return value
  }

  return "date_emission"
}

function parseSortDirection(value: string | null): SortDirection {
  return value === "asc" ? "asc" : "desc"
}

function parseDateFilter(value: string | null): string | null {
  const normalizedValue = normalizeString(value)

  if (!normalizedValue) {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return null
  }

  return normalizedValue
}

function parseFilters(searchParams: URLSearchParams): CreditNotesListFilters {
  return {
    searchNumero: normalizeString(searchParams.get("searchNumero")),
    searchClient: normalizeString(searchParams.get("searchClient")),
    motif: parseMotif(searchParams.get("motif")),
    dateFrom: parseDateFilter(searchParams.get("dateFrom")),
    dateTo: parseDateFilter(searchParams.get("dateTo")),
    sortBy: parseSortBy(searchParams.get("sortBy")),
    sortDirection: parseSortDirection(searchParams.get("sortDirection")),
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  }
}

function toSafeNumber(value: number | string): number {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function getDayStartIso(day: string): string {
  return `${day}T00:00:00.000Z`
}

function getDayEndIso(day: string): string {
  return `${day}T23:59:59.999Z`
}

function compareWithDirection(
  leftValue: string | number,
  rightValue: string | number,
  sortDirection: SortDirection,
): number {
  const directionFactor = sortDirection === "asc" ? 1 : -1

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * directionFactor
  }

  return (
    String(leftValue).localeCompare(String(rightValue), "fr") * directionFactor
  )
}

function applyFiltersToCreditNotesQuery(
  query: FilterableCreditNotesQuery,
  filters: CreditNotesListFilters,
  matchedInvoiceIds: string[] | null,
): FilterableCreditNotesQuery {
  let nextQuery = query

  if (filters.searchNumero) {
    nextQuery = nextQuery.ilike(
      "numero_avoir",
      `%${filters.searchNumero}%`,
    ) as FilterableCreditNotesQuery
  }

  if (filters.motif !== "all") {
    nextQuery = nextQuery.eq(
      "motif",
      filters.motif,
    ) as FilterableCreditNotesQuery
  }

  if (filters.dateFrom) {
    nextQuery = nextQuery.gte(
      "date_emission",
      getDayStartIso(filters.dateFrom),
    ) as FilterableCreditNotesQuery
  }

  if (filters.dateTo) {
    nextQuery = nextQuery.lte(
      "date_emission",
      getDayEndIso(filters.dateTo),
    ) as FilterableCreditNotesQuery
  }

  if (matchedInvoiceIds) {
    nextQuery = nextQuery.in(
      "id_facture",
      matchedInvoiceIds,
    ) as FilterableCreditNotesQuery
  }

  return nextQuery
}

async function fetchMatchedInvoiceIds(
  searchClient: string,
): Promise<string[] | null> {
  if (!searchClient) {
    return null
  }

  const supabaseAdmin = createAdminClient()

  const { data: users, error: usersError } = await supabaseAdmin
    .from("utilisateur")
    .select("id_utilisateur")
    .or(`nom_complet.ilike.%${searchClient}%,email.ilike.%${searchClient}%`)
    .limit(MAX_MATCHED_USERS)

  if (usersError) {
    throw usersError
  }

  const userIds = ((users as IdRow[] | null) ?? [])
    .map((user) => user.id_utilisateur)
    .filter((value): value is string => Boolean(value))

  if (userIds.length === 0) {
    return []
  }

  const orderIds = new Set<string>()

  for (const userIdChunk of splitArrayIntoChunks(
    userIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("commande")
      .select("id_commande")
      .in("id_utilisateur", userIdChunk)
      .limit(MAX_MATCHED_ORDERS)

    if (ordersError) {
      throw ordersError
    }

    const rows = (orders as IdRow[] | null) ?? []

    rows.forEach((row) => {
      if (row.id_commande) {
        orderIds.add(row.id_commande)
      }
    })
  }

  if (orderIds.size === 0) {
    return []
  }

  const invoiceIds = new Set<string>()

  for (const orderIdChunk of splitArrayIntoChunks(
    [...orderIds],
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from("facture")
      .select("id_facture")
      .in("id_commande", orderIdChunk)
      .limit(MAX_MATCHED_INVOICES)

    if (invoicesError) {
      throw invoicesError
    }

    const rows = (invoices as IdRow[] | null) ?? []

    rows.forEach((row) => {
      if (row.id_facture) {
        invoiceIds.add(row.id_facture)
      }
    })
  }

  return [...invoiceIds]
}

async function fetchInvoicesMap(
  invoiceIds: string[],
): Promise<Map<string, InvoiceRow>> {
  const invoiceById = new Map<string, InvoiceRow>()

  if (invoiceIds.length === 0) {
    return invoiceById
  }

  const supabaseAdmin = createAdminClient()

  for (const invoiceIdChunk of splitArrayIntoChunks(
    invoiceIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data, error } = await supabaseAdmin
      .from("facture")
      .select("id_facture, numero_facture, id_commande")
      .in("id_facture", invoiceIdChunk)

    if (error) {
      console.error("Erreur lecture factures avoirs admin", { error })
      continue
    }

    const rows = (data as InvoiceRow[] | null) ?? []

    rows.forEach((row) => {
      invoiceById.set(row.id_facture, row)
    })
  }

  return invoiceById
}

async function fetchOrdersMap(
  orderIds: string[],
): Promise<Map<string, OrderRow>> {
  const orderById = new Map<string, OrderRow>()

  if (orderIds.length === 0) {
    return orderById
  }

  const supabaseAdmin = createAdminClient()

  for (const orderIdChunk of splitArrayIntoChunks(
    orderIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data, error } = await supabaseAdmin
      .from("commande")
      .select("id_commande, numero_commande, id_utilisateur")
      .in("id_commande", orderIdChunk)

    if (error) {
      console.error("Erreur lecture commandes avoirs admin", { error })
      continue
    }

    const rows = (data as OrderRow[] | null) ?? []

    rows.forEach((row) => {
      orderById.set(row.id_commande, row)
    })
  }

  return orderById
}

async function fetchUsersMap(userIds: string[]): Promise<Map<string, UserRow>> {
  const userById = new Map<string, UserRow>()

  if (userIds.length === 0) {
    return userById
  }

  const supabaseAdmin = createAdminClient()

  for (const userIdChunk of splitArrayIntoChunks(
    userIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data, error } = await supabaseAdmin
      .from("utilisateur")
      .select("id_utilisateur, nom_complet, email")
      .in("id_utilisateur", userIdChunk)

    if (error) {
      console.error("Erreur lecture clients avoirs admin", { error })
      continue
    }

    const rows = (data as UserRow[] | null) ?? []

    rows.forEach((row) => {
      userById.set(row.id_utilisateur, row)
    })
  }

  return userById
}

function mapCreditNotesToListItems(
  creditNotes: CreditNoteRow[],
  invoiceById: Map<string, InvoiceRow>,
  orderById: Map<string, OrderRow>,
  userById: Map<string, UserRow>,
): CreditNoteListItem[] {
  return creditNotes.map((creditNote) => {
    const invoice = invoiceById.get(creditNote.id_facture) ?? null
    const order = invoice ? (orderById.get(invoice.id_commande) ?? null) : null
    const customer = order ? (userById.get(order.id_utilisateur) ?? null) : null

    return {
      id_avoir: creditNote.id_avoir,
      numero_avoir: creditNote.numero_avoir,
      date_emission: creditNote.date_emission,
      montant: toSafeNumber(creditNote.montant),
      motif: creditNote.motif,
      pdf_url: creditNote.pdf_url,
      facture: invoice
        ? {
            id_facture: invoice.id_facture,
            numero_facture: invoice.numero_facture,
          }
        : null,
      commande: order
        ? {
            id_commande: order.id_commande,
            numero_commande: order.numero_commande,
          }
        : null,
      client: customer
        ? {
            id_utilisateur: customer.id_utilisateur,
            nom_complet: customer.nom_complet,
            email: customer.email,
          }
        : null,
    }
  })
}

function compareCreditNotesByClient(
  creditNoteA: CreditNoteListItem,
  creditNoteB: CreditNoteListItem,
  sortDirection: SortDirection,
): number {
  const clientA = normalizeString(
    creditNoteA.client?.nom_complet || creditNoteA.client?.email || "",
  )
  const clientB = normalizeString(
    creditNoteB.client?.nom_complet || creditNoteB.client?.email || "",
  )

  return compareWithDirection(clientA, clientB, sortDirection)
}

function paginateArray<T>(items: T[], page: number, pageSize: number): T[] {
  const startIndex = (page - 1) * pageSize
  return items.slice(startIndex, startIndex + pageSize)
}

function toSafePage(page: number, totalPages: number): number {
  if (page < 1) {
    return 1
  }

  if (page > totalPages) {
    return totalPages
  }

  return page
}

async function fetchPagedCreditNotes(
  filters: CreditNotesListFilters,
  matchedInvoiceIds: string[] | null,
): Promise<{ creditNotes: CreditNoteRow[]; total: number } | null> {
  if (matchedInvoiceIds && matchedInvoiceIds.length === 0) {
    return {
      creditNotes: [],
      total: 0,
    }
  }

  const sortColumnByFilter: Record<
    Exclude<CreditNoteSortBy, "client">,
    string
  > = {
    numero_avoir: "numero_avoir",
    date_emission: "date_emission",
    montant: "montant",
    motif: "motif",
  }

  const sortColumn =
    sortColumnByFilter[
      (filters.sortBy === "client"
        ? "date_emission"
        : filters.sortBy) as Exclude<CreditNoteSortBy, "client">
    ]

  const startIndex = (filters.page - 1) * filters.pageSize
  const endIndex = startIndex + filters.pageSize - 1
  const supabaseAdmin = createAdminClient()

  let query = supabaseAdmin
    .from("avoir")
    .select(
      "id_avoir, numero_avoir, id_facture, date_emission, montant, motif, pdf_url",
      { count: "exact" },
    )

  query = applyFiltersToCreditNotesQuery(
    query as unknown as FilterableCreditNotesQuery,
    filters,
    matchedInvoiceIds,
  ) as typeof query

  const { data, error, count } = await query
    .order(sortColumn, {
      ascending: filters.sortDirection === "asc",
    })
    .range(startIndex, endIndex)

  if (error) {
    console.error("Erreur lecture avoirs admin", { error })
    return null
  }

  return {
    creditNotes: (data as CreditNoteRow[] | null) ?? [],
    total: count ?? 0,
  }
}

async function fetchAllFilteredCreditNotes(
  filters: CreditNotesListFilters,
  matchedInvoiceIds: string[] | null,
): Promise<CreditNoteRow[] | null> {
  if (matchedInvoiceIds && matchedInvoiceIds.length === 0) {
    return []
  }

  const supabaseAdmin = createAdminClient()

  let query = supabaseAdmin
    .from("avoir")
    .select(
      "id_avoir, numero_avoir, id_facture, date_emission, montant, motif, pdf_url",
    )

  query = applyFiltersToCreditNotesQuery(
    query as unknown as FilterableCreditNotesQuery,
    filters,
    matchedInvoiceIds,
  ) as typeof query

  const { data, error } = await query

  if (error) {
    console.error("Erreur lecture avoirs admin (full scan)", { error })
    return null
  }

  return (data as CreditNoteRow[] | null) ?? []
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const filters = parseFilters(request.nextUrl.searchParams)
    const matchedInvoiceIds = await fetchMatchedInvoiceIds(filters.searchClient)

    const requiresInMemorySort = filters.sortBy === "client"

    if (!requiresInMemorySort) {
      const pagedCreditNotes = await fetchPagedCreditNotes(
        filters,
        matchedInvoiceIds,
      )

      if (!pagedCreditNotes) {
        return NextResponse.json(
          {
            error: "Erreur lors du chargement des avoirs.",
            code: "admin_credit_notes_read_failed",
          },
          { status: 500 },
        )
      }

      const invoiceIds = [
        ...new Set(
          pagedCreditNotes.creditNotes.map(
            (creditNote) => creditNote.id_facture,
          ),
        ),
      ]
      const invoiceById = await fetchInvoicesMap(invoiceIds)
      const orderIds = [
        ...new Set(
          [...invoiceById.values()].map((invoice) => invoice.id_commande),
        ),
      ]
      const orderById = await fetchOrdersMap(orderIds)
      const userIds = [
        ...new Set(
          [...orderById.values()].map((order) => order.id_utilisateur),
        ),
      ]
      const userById = await fetchUsersMap(userIds)

      const creditNotes = mapCreditNotesToListItems(
        pagedCreditNotes.creditNotes,
        invoiceById,
        orderById,
        userById,
      )

      const totalPages = Math.max(
        1,
        Math.ceil(pagedCreditNotes.total / filters.pageSize),
      )

      return NextResponse.json({
        creditNotes,
        total: pagedCreditNotes.total,
        page: toSafePage(filters.page, totalPages),
        pageSize: filters.pageSize,
        totalPages,
      })
    }

    const allFilteredCreditNotes = await fetchAllFilteredCreditNotes(
      filters,
      matchedInvoiceIds,
    )

    if (!allFilteredCreditNotes) {
      return NextResponse.json(
        {
          error: "Erreur lors du chargement des avoirs.",
          code: "admin_credit_notes_read_failed",
        },
        { status: 500 },
      )
    }

    const allInvoiceIds = [
      ...new Set(
        allFilteredCreditNotes.map((creditNote) => creditNote.id_facture),
      ),
    ]
    const invoiceById = await fetchInvoicesMap(allInvoiceIds)
    const orderIds = [
      ...new Set(
        [...invoiceById.values()].map((invoice) => invoice.id_commande),
      ),
    ]
    const orderById = await fetchOrdersMap(orderIds)
    const userIds = [
      ...new Set([...orderById.values()].map((order) => order.id_utilisateur)),
    ]
    const userById = await fetchUsersMap(userIds)

    const allCreditNotes = mapCreditNotesToListItems(
      allFilteredCreditNotes,
      invoiceById,
      orderById,
      userById,
    )

    const sortedCreditNotes = [...allCreditNotes].sort(
      (creditNoteA, creditNoteB) => {
        const comparedValue = compareCreditNotesByClient(
          creditNoteA,
          creditNoteB,
          filters.sortDirection,
        )

        if (comparedValue !== 0) {
          return comparedValue
        }

        return creditNoteA.numero_avoir.localeCompare(
          creditNoteB.numero_avoir,
          "fr",
        )
      },
    )

    const total = sortedCreditNotes.length
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))
    const safePage = toSafePage(filters.page, totalPages)
    const creditNotes = paginateArray(
      sortedCreditNotes,
      safePage,
      filters.pageSize,
    )

    return NextResponse.json({
      creditNotes,
      total,
      page: safePage,
      pageSize: filters.pageSize,
      totalPages,
    })
  } catch (error) {
    console.error("Erreur inattendue lecture avoirs admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
