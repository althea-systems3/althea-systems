import { NextRequest, NextResponse } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { createAdminClient } from '@/lib/supabase/admin';
import type { InvoiceStatus } from '@/lib/supabase/types';

type InvoiceSortBy =
  | 'numero_facture'
  | 'date_emission'
  | 'client'
  | 'montant_ttc'
  | 'statut';

type SortDirection = 'asc' | 'desc';

type InvoiceStatusFilter = 'all' | InvoiceStatus;

type InvoiceListFilters = {
  searchNumero: string;
  searchClient: string;
  status: InvoiceStatusFilter;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: InvoiceSortBy;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
};

type InvoiceRow = {
  id_facture: string;
  numero_facture: string;
  id_commande: string;
  date_emission: string;
  montant_ttc: number | string;
  statut: InvoiceStatus;
  pdf_url: string | null;
};

type OrderRow = {
  id_commande: string;
  numero_commande: string;
  id_utilisateur: string;
};

type UserRow = {
  id_utilisateur: string;
  nom_complet: string | null;
  email: string | null;
};

type IdRow = {
  id_utilisateur?: string;
  id_commande?: string;
};

type InvoiceListItem = {
  id_facture: string;
  numero_facture: string;
  id_commande: string;
  date_emission: string;
  montant_ttc: number;
  statut: InvoiceStatus;
  pdf_url: string | null;
  commande: {
    id_commande: string;
    numero_commande: string;
  } | null;
  client: {
    id_utilisateur: string;
    nom_complet: string | null;
    email: string | null;
  } | null;
};

type FilterableInvoicesQuery = {
  ilike: (column: string, pattern: string) => unknown;
  eq: (column: string, value: string) => unknown;
  gte: (column: string, value: string) => unknown;
  lte: (column: string, value: string) => unknown;
  in: (column: string, values: string[]) => unknown;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const IN_QUERY_CHUNK_SIZE = 100;
const MAX_MATCHED_USERS = 5000;
const MAX_MATCHED_ORDERS = 10000;

function splitArrayIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function parsePage(value: string | null): number {
  const parsedValue = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return DEFAULT_PAGE;
  }

  return parsedValue;
}

function parsePageSize(value: string | null): number {
  const parsedValue = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(parsedValue, MAX_PAGE_SIZE);
}

function parseStatus(value: string | null): InvoiceStatusFilter {
  if (value === 'payee' || value === 'en_attente' || value === 'annule') {
    return value;
  }

  return 'all';
}

function parseSortBy(value: string | null): InvoiceSortBy {
  if (
    value === 'numero_facture' ||
    value === 'date_emission' ||
    value === 'client' ||
    value === 'montant_ttc' ||
    value === 'statut'
  ) {
    return value;
  }

  return 'date_emission';
}

function parseSortDirection(value: string | null): SortDirection {
  return value === 'asc' ? 'asc' : 'desc';
}

function parseDateFilter(value: string | null): string | null {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function parseFilters(searchParams: URLSearchParams): InvoiceListFilters {
  return {
    searchNumero: normalizeString(searchParams.get('searchNumero')),
    searchClient: normalizeString(searchParams.get('searchClient')),
    status: parseStatus(searchParams.get('status')),
    dateFrom: parseDateFilter(searchParams.get('dateFrom')),
    dateTo: parseDateFilter(searchParams.get('dateTo')),
    sortBy: parseSortBy(searchParams.get('sortBy')),
    sortDirection: parseSortDirection(searchParams.get('sortDirection')),
    page: parsePage(searchParams.get('page')),
    pageSize: parsePageSize(searchParams.get('pageSize')),
  };
}

function toSafeNumber(value: number | string): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getDayStartIso(day: string): string {
  return `${day}T00:00:00.000Z`;
}

function getDayEndIso(day: string): string {
  return `${day}T23:59:59.999Z`;
}

function compareWithDirection(
  leftValue: string | number,
  rightValue: string | number,
  sortDirection: SortDirection,
): number {
  const directionFactor = sortDirection === 'asc' ? 1 : -1;

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * directionFactor;
  }

  return (
    String(leftValue).localeCompare(String(rightValue), 'fr') * directionFactor
  );
}

function applyFiltersToInvoicesQuery(
  query: FilterableInvoicesQuery,
  filters: InvoiceListFilters,
  matchedOrderIds: string[] | null,
): FilterableInvoicesQuery {
  let nextQuery = query;

  if (filters.searchNumero) {
    nextQuery = nextQuery.ilike(
      'numero_facture',
      `%${filters.searchNumero}%`,
    ) as FilterableInvoicesQuery;
  }

  if (filters.status !== 'all') {
    nextQuery = nextQuery.eq(
      'statut',
      filters.status,
    ) as FilterableInvoicesQuery;
  }

  if (filters.dateFrom) {
    nextQuery = nextQuery.gte(
      'date_emission',
      getDayStartIso(filters.dateFrom),
    ) as FilterableInvoicesQuery;
  }

  if (filters.dateTo) {
    nextQuery = nextQuery.lte(
      'date_emission',
      getDayEndIso(filters.dateTo),
    ) as FilterableInvoicesQuery;
  }

  if (matchedOrderIds) {
    nextQuery = nextQuery.in(
      'id_commande',
      matchedOrderIds,
    ) as FilterableInvoicesQuery;
  }

  return nextQuery;
}

async function fetchMatchedOrderIds(
  searchClient: string,
): Promise<string[] | null> {
  if (!searchClient) {
    return null;
  }

  const supabaseAdmin = createAdminClient();

  const { data: users, error: usersError } = await supabaseAdmin
    .from('utilisateur')
    .select('id_utilisateur')
    .or(`nom_complet.ilike.%${searchClient}%,email.ilike.%${searchClient}%`)
    .limit(MAX_MATCHED_USERS);

  if (usersError) {
    throw usersError;
  }

  const userIds = ((users as IdRow[] | null) ?? [])
    .map((user) => user.id_utilisateur)
    .filter((value): value is string => Boolean(value));

  if (userIds.length === 0) {
    return [];
  }

  const matchedOrderIds = new Set<string>();

  for (const userIdChunk of splitArrayIntoChunks(
    userIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commande')
      .select('id_commande')
      .in('id_utilisateur', userIdChunk)
      .limit(MAX_MATCHED_ORDERS);

    if (ordersError) {
      throw ordersError;
    }

    const rows = (orders as IdRow[] | null) ?? [];

    rows.forEach((row) => {
      if (row.id_commande) {
        matchedOrderIds.add(row.id_commande);
      }
    });
  }

  return [...matchedOrderIds];
}

async function fetchOrdersMap(
  orderIds: string[],
): Promise<Map<string, OrderRow>> {
  const orderById = new Map<string, OrderRow>();

  if (orderIds.length === 0) {
    return orderById;
  }

  const supabaseAdmin = createAdminClient();

  for (const orderIdChunk of splitArrayIntoChunks(
    orderIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data, error } = await supabaseAdmin
      .from('commande')
      .select('id_commande, numero_commande, id_utilisateur')
      .in('id_commande', orderIdChunk);

    if (error) {
      console.error('Erreur lecture commandes factures admin', { error });
      continue;
    }

    const rows = (data as OrderRow[] | null) ?? [];

    rows.forEach((row) => {
      orderById.set(row.id_commande, row);
    });
  }

  return orderById;
}

async function fetchUsersMap(userIds: string[]): Promise<Map<string, UserRow>> {
  const userById = new Map<string, UserRow>();

  if (userIds.length === 0) {
    return userById;
  }

  const supabaseAdmin = createAdminClient();

  for (const userIdChunk of splitArrayIntoChunks(
    userIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data, error } = await supabaseAdmin
      .from('utilisateur')
      .select('id_utilisateur, nom_complet, email')
      .in('id_utilisateur', userIdChunk);

    if (error) {
      console.error('Erreur lecture clients factures admin', { error });
      continue;
    }

    const rows = (data as UserRow[] | null) ?? [];

    rows.forEach((row) => {
      userById.set(row.id_utilisateur, row);
    });
  }

  return userById;
}

function mapInvoicesToListItems(
  invoices: InvoiceRow[],
  orderById: Map<string, OrderRow>,
  userById: Map<string, UserRow>,
): InvoiceListItem[] {
  return invoices.map((invoice) => {
    const order = orderById.get(invoice.id_commande) ?? null;
    const customer = order
      ? (userById.get(order.id_utilisateur) ?? null)
      : null;

    return {
      id_facture: invoice.id_facture,
      numero_facture: invoice.numero_facture,
      id_commande: invoice.id_commande,
      date_emission: invoice.date_emission,
      montant_ttc: toSafeNumber(invoice.montant_ttc),
      statut: invoice.statut,
      pdf_url: invoice.pdf_url,
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
    };
  });
}

function compareInvoiceItemsByClient(
  invoiceA: InvoiceListItem,
  invoiceB: InvoiceListItem,
  sortDirection: SortDirection,
): number {
  const clientA = normalizeString(
    invoiceA.client?.nom_complet || invoiceA.client?.email || '',
  );
  const clientB = normalizeString(
    invoiceB.client?.nom_complet || invoiceB.client?.email || '',
  );

  return compareWithDirection(clientA, clientB, sortDirection);
}

function paginateArray<T>(items: T[], page: number, pageSize: number): T[] {
  const startIndex = (page - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}

function toSafePage(page: number, totalPages: number): number {
  if (page < 1) {
    return 1;
  }

  if (page > totalPages) {
    return totalPages;
  }

  return page;
}

async function fetchPagedInvoices(
  filters: InvoiceListFilters,
  matchedOrderIds: string[] | null,
): Promise<{ invoices: InvoiceRow[]; total: number } | null> {
  if (matchedOrderIds && matchedOrderIds.length === 0) {
    return {
      invoices: [],
      total: 0,
    };
  }

  const sortColumnByFilter: Record<Exclude<InvoiceSortBy, 'client'>, string> = {
    numero_facture: 'numero_facture',
    date_emission: 'date_emission',
    montant_ttc: 'montant_ttc',
    statut: 'statut',
  };

  const sortColumn =
    sortColumnByFilter[
      (filters.sortBy === 'client'
        ? 'date_emission'
        : filters.sortBy) as Exclude<InvoiceSortBy, 'client'>
    ];

  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize - 1;
  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from('facture')
    .select(
      'id_facture, numero_facture, id_commande, date_emission, montant_ttc, statut, pdf_url',
      { count: 'exact' },
    );

  query = applyFiltersToInvoicesQuery(
    query as unknown as FilterableInvoicesQuery,
    filters,
    matchedOrderIds,
  ) as typeof query;

  const { data, error, count } = await query
    .order(sortColumn, {
      ascending: filters.sortDirection === 'asc',
    })
    .range(startIndex, endIndex);

  if (error) {
    console.error('Erreur lecture factures admin', { error });
    return null;
  }

  return {
    invoices: (data as InvoiceRow[] | null) ?? [],
    total: count ?? 0,
  };
}

async function fetchAllFilteredInvoices(
  filters: InvoiceListFilters,
  matchedOrderIds: string[] | null,
): Promise<InvoiceRow[] | null> {
  if (matchedOrderIds && matchedOrderIds.length === 0) {
    return [];
  }

  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from('facture')
    .select(
      'id_facture, numero_facture, id_commande, date_emission, montant_ttc, statut, pdf_url',
    );

  query = applyFiltersToInvoicesQuery(
    query as unknown as FilterableInvoicesQuery,
    filters,
    matchedOrderIds,
  ) as typeof query;

  const { data, error } = await query;

  if (error) {
    console.error('Erreur lecture factures admin (full scan)', { error });
    return null;
  }

  return (data as InvoiceRow[] | null) ?? [];
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const filters = parseFilters(request.nextUrl.searchParams);
    const matchedOrderIds = await fetchMatchedOrderIds(filters.searchClient);

    const requiresInMemorySort = filters.sortBy === 'client';

    if (!requiresInMemorySort) {
      const pagedInvoices = await fetchPagedInvoices(filters, matchedOrderIds);

      if (!pagedInvoices) {
        return NextResponse.json(
          {
            error: 'Erreur lors du chargement des factures.',
            code: 'admin_invoices_read_failed',
          },
          { status: 500 },
        );
      }

      const orderIds = [
        ...new Set(
          pagedInvoices.invoices.map((invoice) => invoice.id_commande),
        ),
      ];
      const orderById = await fetchOrdersMap(orderIds);
      const userIds = [
        ...new Set(
          [...orderById.values()].map((order) => order.id_utilisateur),
        ),
      ];
      const userById = await fetchUsersMap(userIds);

      const invoices = mapInvoicesToListItems(
        pagedInvoices.invoices,
        orderById,
        userById,
      );

      const totalPages = Math.max(
        1,
        Math.ceil(pagedInvoices.total / filters.pageSize),
      );

      return NextResponse.json({
        invoices,
        total: pagedInvoices.total,
        page: toSafePage(filters.page, totalPages),
        pageSize: filters.pageSize,
        totalPages,
      });
    }

    const allFilteredInvoices = await fetchAllFilteredInvoices(
      filters,
      matchedOrderIds,
    );

    if (!allFilteredInvoices) {
      return NextResponse.json(
        {
          error: 'Erreur lors du chargement des factures.',
          code: 'admin_invoices_read_failed',
        },
        { status: 500 },
      );
    }

    const allOrderIds = [
      ...new Set(allFilteredInvoices.map((invoice) => invoice.id_commande)),
    ];
    const orderById = await fetchOrdersMap(allOrderIds);
    const userIds = [
      ...new Set([...orderById.values()].map((order) => order.id_utilisateur)),
    ];
    const userById = await fetchUsersMap(userIds);

    const allInvoices = mapInvoicesToListItems(
      allFilteredInvoices,
      orderById,
      userById,
    );

    const sortedInvoices = [...allInvoices].sort((invoiceA, invoiceB) => {
      const comparedValue = compareInvoiceItemsByClient(
        invoiceA,
        invoiceB,
        filters.sortDirection,
      );

      if (comparedValue !== 0) {
        return comparedValue;
      }

      return invoiceA.numero_facture.localeCompare(
        invoiceB.numero_facture,
        'fr',
      );
    });

    const total = sortedInvoices.length;
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
    const safePage = toSafePage(filters.page, totalPages);
    const invoices = paginateArray(sortedInvoices, safePage, filters.pageSize);

    return NextResponse.json({
      invoices,
      total,
      page: safePage,
      pageSize: filters.pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('Erreur inattendue lecture factures admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}
