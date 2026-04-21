import { NextRequest, NextResponse } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import {
  parseEnumFilter,
  parsePaginationParams,
  parseSortParams,
  parseStringFilter,
} from '@/lib/admin/queryBuilders';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderStatus, PaymentStatus } from '@/lib/supabase/types';

type OrderSortBy =
  | 'numero_commande'
  | 'date_commande'
  | 'client'
  | 'montant_ttc'
  | 'statut'
  | 'mode_paiement'
  | 'statut_paiement';

type SortDirection = 'asc' | 'desc';

type OrderStatusFilter = 'all' | OrderStatus;

type PaymentStatusFilter = 'all' | PaymentStatus;

type PaymentMethodFilter = 'all' | string;

type OrderListFilters = {
  searchNumero: string;
  searchClientName: string;
  searchClientEmail: string;
  status: OrderStatusFilter;
  paymentStatus: PaymentStatusFilter;
  paymentMethod: PaymentMethodFilter;
  sortBy: OrderSortBy;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
};

type UserRelation =
  | {
      nom_complet: string | null;
      email: string | null;
    }
  | {
      nom_complet: string | null;
      email: string | null;
    }[]
  | null;

type OrderRow = {
  id_commande: string;
  numero_commande: string;
  date_commande: string;
  montant_ttc: number | string;
  statut: OrderStatus;
  statut_paiement: PaymentStatus;
  mode_paiement: string | null;
  paiement_dernier_4: string | null;
  id_utilisateur: string;
  utilisateur: UserRelation;
};

type MatchedUserRow = {
  id_utilisateur: string;
};

type OrderListItem = {
  id_commande: string;
  numero_commande: string;
  date_commande: string;
  montant_ttc: number;
  statut: OrderStatus;
  statut_paiement: PaymentStatus;
  mode_paiement: string | null;
  paiement_dernier_4_masque: string | null;
  id_utilisateur: string;
  client: {
    nom_complet: string | null;
    email: string | null;
  } | null;
};

type FilterableOrdersQuery = {
  ilike: (column: string, pattern: string) => unknown;
  eq: (column: string, value: string) => unknown;
  in: (column: string, values: string[]) => unknown;
};

const ORDER_PAGE_SIZE_DEFAULT = 20;
const ORDER_PAGE_SIZE_MAX = 100;
const MAX_MATCHED_USERS = 5000;
const MAX_PAYMENT_METHOD_OPTIONS = 2000;

const ORDER_STATUS_VALUES = [
  'en_attente',
  'en_cours',
  'terminee',
  'annulee',
] as const;
const ORDER_PAYMENT_STATUS_VALUES = [
  'valide',
  'en_attente',
  'echoue',
  'rembourse',
] as const;
const ORDER_SORT_KEYS = [
  'numero_commande',
  'date_commande',
  'client',
  'montant_ttc',
  'statut',
  'mode_paiement',
  'statut_paiement',
] as const;

function parsePaymentMethod(value: string | null): PaymentMethodFilter {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue || normalizedValue === 'all') {
    return 'all';
  }

  return normalizedValue;
}

function parseFilters(searchParams: URLSearchParams): OrderListFilters {
  const { page, pageSize } = parsePaginationParams(
    searchParams,
    ORDER_PAGE_SIZE_MAX,
  );

  const sortParamsSource = new URLSearchParams(searchParams);
  if (!sortParamsSource.get('sortDirection') && sortParamsSource.get('sort')) {
    sortParamsSource.set('sortDirection', sortParamsSource.get('sort')!);
  }

  const { sortBy, sortDirection } = parseSortParams(
    sortParamsSource,
    ORDER_SORT_KEYS,
    'date_commande',
    'desc',
  );

  return {
    searchNumero: normalizeString(
      searchParams.get('searchNumero') ?? searchParams.get('search'),
    ),
    searchClientName: parseStringFilter(searchParams, 'searchClientName'),
    searchClientEmail: parseStringFilter(searchParams, 'searchClientEmail'),
    status: parseEnumFilter(
      searchParams,
      'status',
      ORDER_STATUS_VALUES,
      'all',
    ) as OrderStatusFilter,
    paymentStatus: parseEnumFilter(
      searchParams,
      'paymentStatus',
      ORDER_PAYMENT_STATUS_VALUES,
      'all',
    ) as PaymentStatusFilter,
    paymentMethod: parsePaymentMethod(searchParams.get('paymentMethod')),
    sortBy,
    sortDirection,
    page,
    pageSize: pageSize > 0 ? pageSize : ORDER_PAGE_SIZE_DEFAULT,
  };
}

function toSafeNumber(value: number | string): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getOrderUserRelation(
  relation: UserRelation,
): { nom_complet: string | null; email: string | null } | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function maskPaymentLast4(last4: string | null): string | null {
  const safeLast4 = normalizeString(last4);

  if (!safeLast4) {
    return null;
  }

  return `**** **** **** ${safeLast4}`;
}

function mapOrderRowToListItem(orderRow: OrderRow): OrderListItem {
  const user = getOrderUserRelation(orderRow.utilisateur);

  return {
    id_commande: orderRow.id_commande,
    numero_commande: orderRow.numero_commande,
    date_commande: orderRow.date_commande,
    montant_ttc: toSafeNumber(orderRow.montant_ttc),
    statut: orderRow.statut,
    statut_paiement: orderRow.statut_paiement,
    mode_paiement: orderRow.mode_paiement,
    paiement_dernier_4_masque: maskPaymentLast4(orderRow.paiement_dernier_4),
    id_utilisateur: orderRow.id_utilisateur,
    client: user
      ? {
          nom_complet: user.nom_complet,
          email: user.email,
        }
      : null,
  };
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

function toTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareOrderRows(
  orderA: OrderRow,
  orderB: OrderRow,
  sortBy: OrderSortBy,
  sortDirection: SortDirection,
): number {
  if (sortBy === 'numero_commande') {
    return compareWithDirection(
      orderA.numero_commande,
      orderB.numero_commande,
      sortDirection,
    );
  }

  if (sortBy === 'date_commande') {
    return compareWithDirection(
      toTimestamp(orderA.date_commande),
      toTimestamp(orderB.date_commande),
      sortDirection,
    );
  }

  if (sortBy === 'montant_ttc') {
    return compareWithDirection(
      toSafeNumber(orderA.montant_ttc),
      toSafeNumber(orderB.montant_ttc),
      sortDirection,
    );
  }

  if (sortBy === 'statut') {
    return compareWithDirection(orderA.statut, orderB.statut, sortDirection);
  }

  if (sortBy === 'mode_paiement') {
    return compareWithDirection(
      orderA.mode_paiement ?? '',
      orderB.mode_paiement ?? '',
      sortDirection,
    );
  }

  if (sortBy === 'statut_paiement') {
    return compareWithDirection(
      orderA.statut_paiement,
      orderB.statut_paiement,
      sortDirection,
    );
  }

  const userA = getOrderUserRelation(orderA.utilisateur);
  const userB = getOrderUserRelation(orderB.utilisateur);

  const clientA = normalizeString(userA?.nom_complet || userA?.email || '');
  const clientB = normalizeString(userB?.nom_complet || userB?.email || '');

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

function applyFiltersToOrdersQuery(
  query: FilterableOrdersQuery,
  filters: OrderListFilters,
  matchedUserIds: string[] | null,
): FilterableOrdersQuery {
  let nextQuery = query;

  if (filters.searchNumero) {
    nextQuery = nextQuery.ilike(
      'numero_commande',
      `%${filters.searchNumero}%`,
    ) as FilterableOrdersQuery;
  }

  if (filters.status !== 'all') {
    nextQuery = nextQuery.eq('statut', filters.status) as FilterableOrdersQuery;
  }

  if (filters.paymentStatus !== 'all') {
    nextQuery = nextQuery.eq(
      'statut_paiement',
      filters.paymentStatus,
    ) as FilterableOrdersQuery;
  }

  if (filters.paymentMethod !== 'all') {
    nextQuery = nextQuery.eq(
      'mode_paiement',
      filters.paymentMethod,
    ) as FilterableOrdersQuery;
  }

  if (matchedUserIds) {
    nextQuery = nextQuery.in(
      'id_utilisateur',
      matchedUserIds,
    ) as FilterableOrdersQuery;
  }

  return nextQuery;
}

async function fetchMatchedUserIds(
  filters: OrderListFilters,
): Promise<string[] | null> {
  if (!filters.searchClientName && !filters.searchClientEmail) {
    return null;
  }

  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from('utilisateur')
    .select('id_utilisateur')
    .limit(MAX_MATCHED_USERS);

  if (filters.searchClientName) {
    query = query.ilike('nom_complet', `%${filters.searchClientName}%`);
  }

  if (filters.searchClientEmail) {
    query = query.ilike('email', `%${filters.searchClientEmail}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data as MatchedUserRow[] | null) ?? [];

  return rows.map((row) => row.id_utilisateur);
}

async function fetchPaymentMethodOptions(): Promise<string[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('commande')
    .select('mode_paiement')
    .not('mode_paiement', 'is', null)
    .limit(MAX_PAYMENT_METHOD_OPTIONS);

  if (error) {
    console.error('Erreur lecture modes paiement commandes admin', { error });
    return [];
  }

  const rawModes =
    (data as Array<{ mode_paiement: string | null }> | null) ?? [];
  const uniqueModes = new Set<string>();

  rawModes.forEach((row) => {
    const normalizedMode = normalizeString(row.mode_paiement);

    if (normalizedMode) {
      uniqueModes.add(normalizedMode);
    }
  });

  return [...uniqueModes].sort((leftMode, rightMode) =>
    leftMode.localeCompare(rightMode, 'fr'),
  );
}

async function fetchPagedOrders(
  filters: OrderListFilters,
  matchedUserIds: string[] | null,
): Promise<{ orders: OrderRow[]; total: number } | null> {
  if (matchedUserIds && matchedUserIds.length === 0) {
    return {
      orders: [],
      total: 0,
    };
  }

  const sortColumnByFilter: Record<Exclude<OrderSortBy, 'client'>, string> = {
    numero_commande: 'numero_commande',
    date_commande: 'date_commande',
    montant_ttc: 'montant_ttc',
    statut: 'statut',
    mode_paiement: 'mode_paiement',
    statut_paiement: 'statut_paiement',
  };

  const sortColumn =
    sortColumnByFilter[
      (filters.sortBy === 'client'
        ? 'date_commande'
        : filters.sortBy) as Exclude<OrderSortBy, 'client'>
    ];

  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize - 1;
  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from('commande')
    .select(
      'id_commande, numero_commande, date_commande, montant_ttc, statut, statut_paiement, mode_paiement, paiement_dernier_4, id_utilisateur, utilisateur:id_utilisateur(nom_complet, email)',
      { count: 'exact' },
    );

  query = applyFiltersToOrdersQuery(
    query as unknown as FilterableOrdersQuery,
    filters,
    matchedUserIds,
  ) as typeof query;

  const { data, error, count } = await query
    .order(sortColumn, {
      ascending: filters.sortDirection === 'asc',
    })
    .range(startIndex, endIndex);

  if (error) {
    console.error('Erreur lecture commandes admin', { error });
    return null;
  }

  return {
    orders: (data as OrderRow[] | null) ?? [],
    total: count ?? 0,
  };
}

async function fetchAllFilteredOrders(
  filters: OrderListFilters,
  matchedUserIds: string[] | null,
): Promise<OrderRow[] | null> {
  if (matchedUserIds && matchedUserIds.length === 0) {
    return [];
  }

  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from('commande')
    .select(
      'id_commande, numero_commande, date_commande, montant_ttc, statut, statut_paiement, mode_paiement, paiement_dernier_4, id_utilisateur, utilisateur:id_utilisateur(nom_complet, email)',
    );

  query = applyFiltersToOrdersQuery(
    query as unknown as FilterableOrdersQuery,
    filters,
    matchedUserIds,
  ) as typeof query;

  const { data, error } = await query;

  if (error) {
    console.error('Erreur lecture commandes admin (full scan)', { error });
    return null;
  }

  return (data as OrderRow[] | null) ?? [];
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const filters = parseFilters(request.nextUrl.searchParams);
    const [matchedUserIds, paymentMethods] = await Promise.all([
      fetchMatchedUserIds(filters),
      fetchPaymentMethodOptions(),
    ]);

    const requiresInMemorySort = filters.sortBy === 'client';

    if (!requiresInMemorySort) {
      const pagedOrders = await fetchPagedOrders(filters, matchedUserIds);

      if (!pagedOrders) {
        return NextResponse.json(
          {
            error: 'Erreur lors du chargement des commandes.',
            code: 'admin_orders_read_failed',
          },
          { status: 500 },
        );
      }

      const totalPages = Math.max(
        1,
        Math.ceil(pagedOrders.total / filters.pageSize),
      );

      return NextResponse.json({
        orders: pagedOrders.orders.map(mapOrderRowToListItem),
        total: pagedOrders.total,
        page: toSafePage(filters.page, totalPages),
        pageSize: filters.pageSize,
        totalPages,
        paymentMethods,
      });
    }

    const allFilteredOrders = await fetchAllFilteredOrders(
      filters,
      matchedUserIds,
    );

    if (!allFilteredOrders) {
      return NextResponse.json(
        {
          error: 'Erreur lors du chargement des commandes.',
          code: 'admin_orders_read_failed',
        },
        { status: 500 },
      );
    }

    const sortedOrders = [...allFilteredOrders].sort((orderA, orderB) => {
      const comparedValue = compareOrderRows(
        orderA,
        orderB,
        filters.sortBy,
        filters.sortDirection,
      );

      if (comparedValue !== 0) {
        return comparedValue;
      }

      return orderA.numero_commande.localeCompare(orderB.numero_commande, 'fr');
    });

    const total = sortedOrders.length;
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
    const safePage = toSafePage(filters.page, totalPages);
    const pagedOrders = paginateArray(sortedOrders, safePage, filters.pageSize);

    return NextResponse.json({
      orders: pagedOrders.map(mapOrderRowToListItem),
      total,
      page: safePage,
      pageSize: filters.pageSize,
      totalPages,
      paymentMethods,
    });
  } catch (error) {
    console.error('Erreur inattendue lecture commandes admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}
