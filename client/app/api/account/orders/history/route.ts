import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import { parseHistoryFilters } from '@/lib/account/validation';
import {
  HISTORY_DEFAULT_PAGE_SIZE,
  HISTORY_MAX_PAGE_SIZE,
  ORDER_STATUSES,
} from '@/lib/account/constants';

// --- Types ---

type OrderRow = {
  id_commande: string;
  numero_commande: string;
  date_commande: string;
  montant_ttc: number | string;
  statut: string;
  statut_paiement: string;
};

type OrderLineRow = {
  id_commande: string;
  id_produit: string;
};

type ProductRow = {
  id_produit: string;
  nom: string;
};

// --- Helpers ---

function toSafeNumber(value: number | string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function extractYears(dates: string[]): number[] {
  const years = new Set<number>();

  for (const date of dates) {
    const year = new Date(date).getFullYear();

    if (Number.isFinite(year)) {
      years.add(year);
    }
  }

  return Array.from(years).sort((a, b) => b - a);
}

async function fetchOrderIdsByProductSearch(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  search: string,
  userOrderIds: string[],
): Promise<string[] | null> {
  if (userOrderIds.length === 0) {
    return [];
  }

  const { data: products } = await supabaseAdmin
    .from('produit')
    .select('id_produit')
    .ilike('nom', `%${search}%`);

  if (!products || products.length === 0) {
    return [];
  }

  const productIds = (products as ProductRow[]).map((p) => p.id_produit);

  const { data: lines } = await supabaseAdmin
    .from('ligne_commande')
    .select('id_commande')
    .in('id_produit', productIds)
    .in('id_commande', userOrderIds);

  if (!lines || lines.length === 0) {
    return [];
  }

  return [...new Set((lines as OrderLineRow[]).map((l) => l.id_commande))];
}

async function fetchOrderIdsByCategoryFilter(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  category: string,
  userOrderIds: string[],
): Promise<string[] | null> {
  if (userOrderIds.length === 0) {
    return [];
  }

  const { data: categoryRows } = await supabaseAdmin
    .from('categorie')
    .select('id_categorie')
    .ilike('slug', category);

  if (!categoryRows || categoryRows.length === 0) {
    return [];
  }

  const categoryIds = (categoryRows as { id_categorie: string }[]).map(
    (c) => c.id_categorie,
  );

  const { data: productCategories } = await supabaseAdmin
    .from('produit_categorie')
    .select('id_produit')
    .in('id_categorie', categoryIds);

  if (!productCategories || productCategories.length === 0) {
    return [];
  }

  const productIds = (productCategories as { id_produit: string }[]).map(
    (pc) => pc.id_produit,
  );

  const { data: lines } = await supabaseAdmin
    .from('ligne_commande')
    .select('id_commande')
    .in('id_produit', productIds)
    .in('id_commande', userOrderIds);

  if (!lines || lines.length === 0) {
    return [];
  }

  return [...new Set((lines as OrderLineRow[]).map((l) => l.id_commande))];
}

async function buildProductSummaries(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderIds: string[],
): Promise<Map<string, { firstProduct: string; totalCount: number }>> {
  const summaries = new Map<
    string,
    { firstProduct: string; totalCount: number }
  >();

  if (orderIds.length === 0) {
    return summaries;
  }

  const { data: linesData } = await supabaseAdmin
    .from('ligne_commande')
    .select('id_commande, id_produit')
    .in('id_commande', orderIds);

  if (!linesData || linesData.length === 0) {
    return summaries;
  }

  const lines = linesData as OrderLineRow[];
  const allProductIds = [...new Set(lines.map((l) => l.id_produit))];

  const { data: productsData } = await supabaseAdmin
    .from('produit')
    .select('id_produit, nom')
    .in('id_produit', allProductIds);

  const productNameById = new Map<string, string>();

  if (productsData) {
    for (const product of productsData as ProductRow[]) {
      productNameById.set(product.id_produit, product.nom);
    }
  }

  const linesByOrder = new Map<string, Set<string>>();

  for (const line of lines) {
    const existing = linesByOrder.get(line.id_commande);

    if (existing) {
      existing.add(line.id_produit);
    } else {
      linesByOrder.set(line.id_commande, new Set([line.id_produit]));
    }
  }

  for (const [orderId, productIdSet] of linesByOrder.entries()) {
    const productIdsArray = Array.from(productIdSet);
    const firstName = productNameById.get(productIdsArray[0]) ?? 'Produit';

    summaries.set(orderId, {
      firstProduct: firstName,
      totalCount: productIdsArray.length,
    });
  }

  return summaries;
}

// --- Handler ---

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const filters = parseHistoryFilters(
      request.nextUrl.searchParams,
      HISTORY_DEFAULT_PAGE_SIZE,
      HISTORY_MAX_PAGE_SIZE,
    );

    const supabaseAdmin = createAdminClient();

    // --- Available years ---

    const { data: allDatesData } = await supabaseAdmin
      .from('commande')
      .select('date_commande')
      .eq('id_utilisateur', auth.userId);

    const allDates = ((allDatesData ?? []) as { date_commande: string }[]).map(
      (d) => d.date_commande,
    );
    const availableYears = extractYears(allDates);

    // --- Pre-filter order IDs for search/category ---

    let restrictedOrderIds: string[] | null = null;

    if (filters.search && !filters.searchDate) {
      // Search by product name — need all user order IDs first
      const { data: userOrdersData } = await supabaseAdmin
        .from('commande')
        .select('id_commande')
        .eq('id_utilisateur', auth.userId);

      const userOrderIds = (
        (userOrdersData ?? []) as { id_commande: string }[]
      ).map((o) => o.id_commande);

      restrictedOrderIds = await fetchOrderIdsByProductSearch(
        supabaseAdmin,
        filters.search,
        userOrderIds,
      );

      if (restrictedOrderIds && restrictedOrderIds.length === 0) {
        return NextResponse.json({
          orders: [],
          filters: {
            availableYears,
            availableStatuses: [...ORDER_STATUSES],
          },
          pagination: { page: filters.page, limit: filters.limit, total: 0 },
        });
      }
    }

    if (filters.category) {
      const { data: userOrdersData } = await supabaseAdmin
        .from('commande')
        .select('id_commande')
        .eq('id_utilisateur', auth.userId);

      const userOrderIds = (
        (userOrdersData ?? []) as { id_commande: string }[]
      ).map((o) => o.id_commande);

      const categoryOrderIds = await fetchOrderIdsByCategoryFilter(
        supabaseAdmin,
        filters.category,
        userOrderIds,
      );

      if (categoryOrderIds && categoryOrderIds.length === 0) {
        return NextResponse.json({
          orders: [],
          filters: {
            availableYears,
            availableStatuses: [...ORDER_STATUSES],
          },
          pagination: { page: filters.page, limit: filters.limit, total: 0 },
        });
      }

      if (restrictedOrderIds) {
        const categorySet = new Set(categoryOrderIds);
        restrictedOrderIds = restrictedOrderIds.filter((id) =>
          categorySet.has(id),
        );
      } else {
        restrictedOrderIds = categoryOrderIds;
      }

      if (restrictedOrderIds && restrictedOrderIds.length === 0) {
        return NextResponse.json({
          orders: [],
          filters: {
            availableYears,
            availableStatuses: [...ORDER_STATUSES],
          },
          pagination: { page: filters.page, limit: filters.limit, total: 0 },
        });
      }
    }

    // --- Build main query ---

    let query = supabaseAdmin
      .from('commande')
      .select(
        'id_commande, numero_commande, date_commande, montant_ttc, statut, statut_paiement',
        { count: 'exact' },
      )
      .eq('id_utilisateur', auth.userId);

    if (filters.year) {
      query = query
        .gte('date_commande', `${filters.year}-01-01T00:00:00.000Z`)
        .lt('date_commande', `${filters.year + 1}-01-01T00:00:00.000Z`);
    }

    if (filters.status) {
      query = query.eq('statut', filters.status);
    }

    if (filters.searchDate) {
      const nextDay = new Date(filters.searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      query = query
        .gte('date_commande', `${filters.searchDate}T00:00:00.000Z`)
        .lt('date_commande', `${nextDayStr}T00:00:00.000Z`);
    }

    if (restrictedOrderIds) {
      query = query.in('id_commande', restrictedOrderIds);
    }

    const { data: ordersData, error: ordersError, count } = await query
      .order('date_commande', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (ordersError || !ordersData) {
      console.error('Erreur lecture historique commandes', {
        ordersError,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de charger l\'historique', code: 'history_fetch_failed' },
        { status: 500 },
      );
    }

    const orders = ordersData as OrderRow[];
    const orderIds = orders.map((o) => o.id_commande);

    // --- Product summaries ---

    const productSummaries = await buildProductSummaries(
      supabaseAdmin,
      orderIds,
    );

    return NextResponse.json({
      orders: orders.map((order) => {
        const summary = productSummaries.get(order.id_commande);

        return {
          orderNumber: order.numero_commande,
          createdAt: order.date_commande,
          totalTtc: toSafeNumber(order.montant_ttc),
          status: order.statut,
          paymentStatus: order.statut_paiement,
          productSummary: summary
            ? {
                firstProduct: summary.firstProduct,
                totalCount: summary.totalCount,
              }
            : null,
        };
      }),
      filters: {
        availableYears,
        availableStatuses: [...ORDER_STATUSES],
      },
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count ?? 0,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue historique commandes', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
