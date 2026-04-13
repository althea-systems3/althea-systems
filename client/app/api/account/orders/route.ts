import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import { parsePaginationParams } from '@/lib/account/validation';
import {
  ORDERS_DEFAULT_LIMIT,
  ORDERS_MAX_LIMIT,
} from '@/lib/account/constants';

// --- Types ---

type OrderRow = {
  id_commande: string;
  numero_commande: string;
  date_commande: string;
  montant_ttc: number;
  statut: string;
  statut_paiement: string;
};

type InvoiceRow = {
  id_commande: string;
  numero_facture: string;
  statut: string;
  pdf_url: string | null;
};

type OrderLineRow = {
  id_commande: string;
  id_produit: string;
};

type ProductRow = {
  id_produit: string;
  nom: string;
};

type OrderMetadata = {
  orderType: 'mono_produit' | 'multi_produits';
  productCount: number;
  productNames: string[];
};

// --- Helpers ---

async function buildOrderMetadata(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderIds: string[],
): Promise<Map<string, OrderMetadata>> {
  const metadataByOrderId = new Map<string, OrderMetadata>();

  if (orderIds.length === 0) {
    return metadataByOrderId;
  }

  const { data: orderLinesData, error: orderLinesError } = await supabaseAdmin
    .from('ligne_commande')
    .select('id_commande, id_produit')
    .in('id_commande', orderIds);

  if (orderLinesError || !orderLinesData) {
    console.error('Erreur lecture lignes commandes compte', {
      orderLinesError,
      orderIds,
    });

    return metadataByOrderId;
  }

  const orderLines = orderLinesData as OrderLineRow[];
  const productIds = Array.from(
    new Set(orderLines.map((line) => line.id_produit)),
  );

  let productNameById = new Map<string, string>();

  if (productIds.length > 0) {
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from('produit')
      .select('id_produit, nom')
      .in('id_produit', productIds);

    if (productsError || !productsData) {
      console.error('Erreur lecture produits commandes compte', {
        productsError,
        productIds,
      });
    } else {
      productNameById = new Map(
        (productsData as ProductRow[]).map((product) => [
          product.id_produit,
          product.nom,
        ]),
      );
    }
  }

  const productIdsByOrder = new Map<string, Set<string>>();

  for (const line of orderLines) {
    const orderProductIds = productIdsByOrder.get(line.id_commande);

    if (orderProductIds) {
      orderProductIds.add(line.id_produit);
      continue;
    }

    productIdsByOrder.set(line.id_commande, new Set([line.id_produit]));
  }

  for (const [orderId, distinctProductIds] of productIdsByOrder.entries()) {
    const productNames = Array.from(distinctProductIds)
      .map((productId) => productNameById.get(productId))
      .filter((name): name is string => Boolean(name));

    metadataByOrderId.set(orderId, {
      orderType:
        distinctProductIds.size > 1 ? 'multi_produits' : 'mono_produit',
      productCount: distinctProductIds.size,
      productNames,
    });
  }

  return metadataByOrderId;
}

// --- Handler ---

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const { limit, offset } = parsePaginationParams(
      request.nextUrl.searchParams,
      ORDERS_DEFAULT_LIMIT,
      ORDERS_MAX_LIMIT,
    );

    const supabaseAdmin = createAdminClient();

    const { data: ordersData, error: ordersError, count } = await supabaseAdmin
      .from('commande')
      .select(
        'id_commande, numero_commande, date_commande, montant_ttc, statut, statut_paiement',
        { count: 'exact' },
      )
      .eq('id_utilisateur', auth.userId)
      .order('date_commande', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError || !ordersData) {
      console.error('Erreur lecture commandes compte', {
        ordersError,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de charger les commandes', code: 'orders_fetch_failed' },
        { status: 500 },
      );
    }

    const orders = ordersData as OrderRow[];
    const orderIds = orders.map((order) => order.id_commande);

    let invoiceByOrderId = new Map<string, InvoiceRow>();
    let orderMetadataByOrderId = new Map<string, OrderMetadata>();

    if (orderIds.length > 0) {
      const { data: invoicesData } = await supabaseAdmin
        .from('facture')
        .select('id_commande, numero_facture, statut, pdf_url')
        .in('id_commande', orderIds);

      const invoices = (invoicesData ?? []) as InvoiceRow[];
      invoiceByOrderId = new Map(
        invoices.map((invoice) => [invoice.id_commande, invoice]),
      );

      orderMetadataByOrderId = await buildOrderMetadata(supabaseAdmin, orderIds);
    }

    return NextResponse.json({
      orders: orders.map((order) => {
        const invoice = invoiceByOrderId.get(order.id_commande);
        const orderMetadata = orderMetadataByOrderId.get(order.id_commande);

        return {
          id: order.id_commande,
          orderNumber: order.numero_commande,
          createdAt: order.date_commande,
          totalTtc: order.montant_ttc,
          status: order.statut,
          paymentStatus: order.statut_paiement,
          orderType: orderMetadata?.orderType ?? 'mono_produit',
          productCount: orderMetadata?.productCount ?? 0,
          productNames: orderMetadata?.productNames ?? [],
          invoice: invoice
            ? {
                invoiceNumber: invoice.numero_facture,
                status: invoice.statut,
                pdfUrl: invoice.pdf_url,
              }
            : null,
        };
      }),
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue lecture commandes compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
