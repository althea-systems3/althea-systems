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
import type { UserStatus } from '@/lib/supabase/types';

type UserSortBy =
  | 'nom'
  | 'date_inscription'
  | 'nombre_commandes'
  | 'ca_total'
  | 'derniere_connexion';

type SortDirection = 'asc' | 'desc';

type StatusFilter = 'all' | UserStatus;

type UserListFilters = {
  searchName: string;
  searchEmail: string;
  status: StatusFilter;
  sortBy: UserSortBy;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
};

type UserBaseRow = {
  id_utilisateur: string;
  email: string;
  nom_complet: string;
  est_admin: boolean;
  statut: UserStatus;
  email_verifie: boolean;
  date_inscription: string;
};

type UserOrderRow = {
  id_utilisateur: string;
  montant_ttc: number | string;
};

type UserAddressRow = {
  id_utilisateur: string;
  id_adresse: string;
  adresse_1: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
};

type UserOrderStats = {
  orderCount: number;
  revenueTotal: number;
};

type UserListItem = UserBaseRow & {
  nombre_commandes: number;
  chiffre_affaires_total: number;
  derniere_connexion: string | null;
  adresses_facturation: string[];
  adresses_facturation_count: number;
};

const USER_PAGE_SIZE_DEFAULT = 20;
const USER_PAGE_SIZE_MAX = 100;
const IN_QUERY_CHUNK_SIZE = 100;
const MAX_AUTH_PAGES = 20;
const AUTH_PAGE_SIZE = 1000;

const USER_SORT_KEYS = [
  'nom',
  'date_inscription',
  'nombre_commandes',
  'ca_total',
  'derniere_connexion',
] as const;

const USER_STATUS_VALUES = ['actif', 'inactif', 'en_attente'] as const;

function splitArrayIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function parseFilters(searchParams: URLSearchParams): UserListFilters {
  const { page, pageSize } = parsePaginationParams(
    searchParams,
    USER_PAGE_SIZE_MAX,
  );
  const { sortBy, sortDirection } = parseSortParams(
    searchParams,
    USER_SORT_KEYS,
    'date_inscription',
    'desc',
  );

  return {
    searchName: parseStringFilter(searchParams, 'searchName'),
    searchEmail: parseStringFilter(searchParams, 'searchEmail'),
    status: parseEnumFilter(
      searchParams,
      'status',
      USER_STATUS_VALUES,
      'all',
    ) as StatusFilter,
    sortBy,
    sortDirection,
    page,
    pageSize: pageSize > 0 ? pageSize : USER_PAGE_SIZE_DEFAULT,
  };
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return timestamp;
}

function formatBillingAddressLabel(address: UserAddressRow): string {
  const parts = [
    normalizeString(address.adresse_1),
    normalizeString(address.code_postal),
    normalizeString(address.ville),
    normalizeString(address.pays),
  ].filter(Boolean);

  return parts.join(' ');
}

function compareUserRows(
  userA: UserListItem,
  userB: UserListItem,
  sortBy: UserSortBy,
  sortDirection: SortDirection,
): number {
  const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

  if (sortBy === 'nom') {
    return (
      userA.nom_complet.localeCompare(userB.nom_complet, 'fr') *
      directionMultiplier
    );
  }

  if (sortBy === 'date_inscription') {
    return (
      (toTimestamp(userA.date_inscription) -
        toTimestamp(userB.date_inscription)) *
      directionMultiplier
    );
  }

  if (sortBy === 'nombre_commandes') {
    return (
      (userA.nombre_commandes - userB.nombre_commandes) * directionMultiplier
    );
  }

  if (sortBy === 'ca_total') {
    return (
      (userA.chiffre_affaires_total - userB.chiffre_affaires_total) *
      directionMultiplier
    );
  }

  return (
    (toTimestamp(userA.derniere_connexion) -
      toTimestamp(userB.derniere_connexion)) *
    directionMultiplier
  );
}

function applyFiltersToUsersQuery(
  query: {
    ilike: (column: string, pattern: string) => unknown;
    eq: (column: string, value: string) => unknown;
  },
  filters: UserListFilters,
) {
  let nextQuery = query;

  if (filters.searchName) {
    nextQuery = nextQuery.ilike(
      'nom_complet',
      `%${filters.searchName}%`,
    ) as typeof query;
  }

  if (filters.searchEmail) {
    nextQuery = nextQuery.ilike(
      'email',
      `%${filters.searchEmail}%`,
    ) as typeof query;
  }

  if (filters.status !== 'all') {
    nextQuery = nextQuery.eq('statut', filters.status) as typeof query;
  }

  return nextQuery;
}

async function fetchPagedUsers(
  filters: UserListFilters,
): Promise<{ users: UserBaseRow[]; total: number } | null> {
  const supabaseAdmin = createAdminClient();

  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize - 1;

  const sortColumn =
    filters.sortBy === 'nom' ? 'nom_complet' : 'date_inscription';

  let query = supabaseAdmin
    .from('utilisateur')
    .select(
      'id_utilisateur, email, nom_complet, est_admin, statut, email_verifie, date_inscription',
      {
        count: 'exact',
      },
    );

  query = applyFiltersToUsersQuery(query, filters) as typeof query;

  const { data, error, count } = await query
    .order(sortColumn, {
      ascending: filters.sortDirection === 'asc',
    })
    .range(startIndex, endIndex);

  if (error) {
    console.error('Erreur lecture utilisateurs admin', { error });
    return null;
  }

  return {
    users: (data as UserBaseRow[] | null) ?? [],
    total: count ?? 0,
  };
}

async function fetchAllFilteredUsers(
  filters: UserListFilters,
): Promise<UserBaseRow[] | null> {
  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from('utilisateur')
    .select(
      'id_utilisateur, email, nom_complet, est_admin, statut, email_verifie, date_inscription',
    );

  query = applyFiltersToUsersQuery(query, filters) as typeof query;

  const { data, error } = await query;

  if (error) {
    console.error('Erreur lecture utilisateurs admin (full scan)', { error });
    return null;
  }

  return (data as UserBaseRow[] | null) ?? [];
}

async function fetchOrderStatsByUserIds(
  userIds: string[],
): Promise<Map<string, UserOrderStats>> {
  const orderStatsByUserId = new Map<string, UserOrderStats>();

  if (userIds.length === 0) {
    return orderStatsByUserId;
  }

  const supabaseAdmin = createAdminClient();

  userIds.forEach((userId) => {
    orderStatsByUserId.set(userId, {
      orderCount: 0,
      revenueTotal: 0,
    });
  });

  for (const userIdChunk of splitArrayIntoChunks(
    userIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data, error } = await supabaseAdmin
      .from('commande')
      .select('id_utilisateur, montant_ttc')
      .in('id_utilisateur', userIdChunk);

    if (error) {
      console.error('Erreur lecture commandes utilisateurs admin', { error });
      continue;
    }

    const orderRows = (data as UserOrderRow[] | null) ?? [];

    orderRows.forEach((orderRow) => {
      const currentStats = orderStatsByUserId.get(orderRow.id_utilisateur) ?? {
        orderCount: 0,
        revenueTotal: 0,
      };

      const amount = Number(orderRow.montant_ttc);

      orderStatsByUserId.set(orderRow.id_utilisateur, {
        orderCount: currentStats.orderCount + 1,
        revenueTotal:
          currentStats.revenueTotal + (Number.isFinite(amount) ? amount : 0),
      });
    });
  }

  return orderStatsByUserId;
}

async function fetchBillingAddressesByUserIds(
  userIds: string[],
): Promise<Map<string, string[]>> {
  const billingAddressesByUserId = new Map<string, string[]>();

  if (userIds.length === 0) {
    return billingAddressesByUserId;
  }

  const supabaseAdmin = createAdminClient();

  userIds.forEach((userId) => {
    billingAddressesByUserId.set(userId, []);
  });

  for (const userIdChunk of splitArrayIntoChunks(
    userIds,
    IN_QUERY_CHUNK_SIZE,
  )) {
    const { data, error } = await supabaseAdmin
      .from('adresse')
      .select('id_utilisateur, id_adresse, adresse_1, code_postal, ville, pays')
      .in('id_utilisateur', userIdChunk);

    if (error) {
      console.error('Erreur lecture adresses utilisateurs admin', { error });
      continue;
    }

    const addressRows = (data as UserAddressRow[] | null) ?? [];

    addressRows.forEach((addressRow) => {
      const addressLabel = formatBillingAddressLabel(addressRow);

      if (!addressLabel) {
        return;
      }

      const currentLabels = billingAddressesByUserId.get(
        addressRow.id_utilisateur,
      );

      if (!currentLabels) {
        billingAddressesByUserId.set(addressRow.id_utilisateur, [addressLabel]);
        return;
      }

      if (!currentLabels.includes(addressLabel)) {
        currentLabels.push(addressLabel);
      }
    });
  }

  return billingAddressesByUserId;
}

async function fetchLastSignInByUserIds(
  userIds: string[],
): Promise<Map<string, string | null>> {
  const lastSignInByUserId = new Map<string, string | null>();

  if (userIds.length === 0) {
    return lastSignInByUserId;
  }

  const supabaseAdmin = createAdminClient();

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { data, error } =
          await supabaseAdmin.auth.admin.getUserById(userId);

        if (error || !data?.user) {
          lastSignInByUserId.set(userId, null);
          return;
        }

        lastSignInByUserId.set(userId, data.user.last_sign_in_at ?? null);
      } catch {
        lastSignInByUserId.set(userId, null);
      }
    }),
  );

  return lastSignInByUserId;
}

async function fetchAllAuthLastSignIn(): Promise<Map<string, string | null>> {
  const lastSignInByUserId = new Map<string, string | null>();
  const supabaseAdmin = createAdminClient();

  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: AUTH_PAGE_SIZE,
      });

      if (error || !data?.users?.length) {
        break;
      }

      data.users.forEach((user) => {
        lastSignInByUserId.set(user.id, user.last_sign_in_at ?? null);
      });

      if (data.users.length < AUTH_PAGE_SIZE) {
        break;
      }
    } catch {
      break;
    }
  }

  return lastSignInByUserId;
}

function buildEnrichedUsers(
  baseUsers: UserBaseRow[],
  orderStatsByUserId: Map<string, UserOrderStats>,
  lastSignInByUserId: Map<string, string | null>,
  billingAddressesByUserId: Map<string, string[]>,
): UserListItem[] {
  return baseUsers.map((user) => {
    const userOrderStats = orderStatsByUserId.get(user.id_utilisateur) ?? {
      orderCount: 0,
      revenueTotal: 0,
    };

    const billingAddresses =
      billingAddressesByUserId.get(user.id_utilisateur) ?? [];

    return {
      ...user,
      nombre_commandes: userOrderStats.orderCount,
      chiffre_affaires_total:
        Math.round(userOrderStats.revenueTotal * 100) / 100,
      derniere_connexion: lastSignInByUserId.get(user.id_utilisateur) ?? null,
      adresses_facturation: billingAddresses,
      adresses_facturation_count: billingAddresses.length,
    };
  });
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

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const filters = parseFilters(request.nextUrl.searchParams);
    const requiresInMemorySort =
      filters.sortBy === 'nombre_commandes' ||
      filters.sortBy === 'ca_total' ||
      filters.sortBy === 'derniere_connexion';

    if (!requiresInMemorySort) {
      const pagedUsers = await fetchPagedUsers(filters);

      if (!pagedUsers) {
        return NextResponse.json(
          {
            error: 'Erreur lors du chargement des utilisateurs.',
            code: 'admin_users_read_failed',
          },
          { status: 500 },
        );
      }

      const userIds = pagedUsers.users.map((user) => user.id_utilisateur);
      const [orderStatsByUserId, billingAddressesByUserId, lastSignInByUserId] =
        await Promise.all([
          fetchOrderStatsByUserIds(userIds),
          fetchBillingAddressesByUserIds(userIds),
          fetchLastSignInByUserIds(userIds),
        ]);

      const enrichedUsers = buildEnrichedUsers(
        pagedUsers.users,
        orderStatsByUserId,
        lastSignInByUserId,
        billingAddressesByUserId,
      );

      const totalPages = Math.max(
        1,
        Math.ceil(pagedUsers.total / filters.pageSize),
      );

      return NextResponse.json({
        users: enrichedUsers,
        total: pagedUsers.total,
        page: toSafePage(filters.page, totalPages),
        pageSize: filters.pageSize,
        totalPages,
      });
    }

    const allFilteredUsers = await fetchAllFilteredUsers(filters);

    if (!allFilteredUsers) {
      return NextResponse.json(
        {
          error: 'Erreur lors du chargement des utilisateurs.',
          code: 'admin_users_read_failed',
        },
        { status: 500 },
      );
    }

    const allUserIds = allFilteredUsers.map((user) => user.id_utilisateur);

    const [orderStatsByUserId, allLastSignInByUserId] = await Promise.all([
      fetchOrderStatsByUserIds(allUserIds),
      filters.sortBy === 'derniere_connexion'
        ? fetchAllAuthLastSignIn()
        : Promise.resolve(new Map<string, string | null>()),
    ]);

    const sortableUsers = buildEnrichedUsers(
      allFilteredUsers,
      orderStatsByUserId,
      allLastSignInByUserId,
      new Map<string, string[]>(),
    );

    const sortedUsers = [...sortableUsers].sort((userA, userB) => {
      const comparedValue = compareUserRows(
        userA,
        userB,
        filters.sortBy,
        filters.sortDirection,
      );

      if (comparedValue !== 0) {
        return comparedValue;
      }

      return userA.nom_complet.localeCompare(userB.nom_complet, 'fr');
    });

    const total = sortedUsers.length;
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
    const safePage = toSafePage(filters.page, totalPages);

    const pagedUsers = paginateArray(sortedUsers, safePage, filters.pageSize);
    const pagedUserIds = pagedUsers.map((user) => user.id_utilisateur);

    const [billingAddressesByUserId, pagedLastSignInByUserId] =
      await Promise.all([
        fetchBillingAddressesByUserIds(pagedUserIds),
        filters.sortBy === 'derniere_connexion'
          ? Promise.resolve(new Map<string, string | null>())
          : fetchLastSignInByUserIds(pagedUserIds),
      ]);

    const users = pagedUsers.map((user) => {
      const billingAddresses =
        billingAddressesByUserId.get(user.id_utilisateur) ?? [];
      const lastSignIn =
        filters.sortBy === 'derniere_connexion'
          ? (allLastSignInByUserId.get(user.id_utilisateur) ?? null)
          : (pagedLastSignInByUserId.get(user.id_utilisateur) ?? null);

      return {
        ...user,
        derniere_connexion: lastSignIn,
        adresses_facturation: billingAddresses,
        adresses_facturation_count: billingAddresses.length,
      };
    });

    return NextResponse.json({
      users,
      total,
      page: safePage,
      pageSize: filters.pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('Erreur inattendue lecture utilisateurs admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}
