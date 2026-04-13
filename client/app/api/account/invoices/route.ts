import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import { parsePaginationParams } from '@/lib/account/validation';
import {
  ORDERS_DEFAULT_LIMIT,
  ORDERS_MAX_LIMIT,
} from '@/lib/account/constants';

// --- Types ---

type InvoiceRow = {
  id_facture: string;
  numero_facture: string;
  id_commande: string;
  date_emission: string;
  montant_ttc: number | string;
  statut: string;
  pdf_url: string | null;
};

type OrderRow = {
  id_commande: string;
  numero_commande: string;
};

// --- Helpers ---

function toSafeNumber(value: number | string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
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

    // --- Fetch user's order IDs ---

    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('commande')
      .select('id_commande, numero_commande')
      .eq('id_utilisateur', auth.userId);

    if (ordersError || !ordersData) {
      console.error('Erreur lecture commandes pour factures compte', {
        ordersError,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de charger les factures', code: 'invoices_fetch_failed' },
        { status: 500 },
      );
    }

    const orders = ordersData as OrderRow[];
    const orderIds = orders.map((o) => o.id_commande);

    if (orderIds.length === 0) {
      return NextResponse.json({
        invoices: [],
        pagination: { limit, offset, total: 0 },
      });
    }

    const orderNumberById = new Map(
      orders.map((o) => [o.id_commande, o.numero_commande]),
    );

    // --- Fetch invoices with pagination ---

    const { data: invoicesData, error: invoicesError, count } = await supabaseAdmin
      .from('facture')
      .select(
        'id_facture, numero_facture, id_commande, date_emission, montant_ttc, statut, pdf_url',
        { count: 'exact' },
      )
      .in('id_commande', orderIds)
      .order('date_emission', { ascending: false })
      .range(offset, offset + limit - 1);

    if (invoicesError || !invoicesData) {
      console.error('Erreur lecture factures compte', {
        invoicesError,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de charger les factures', code: 'invoices_fetch_failed' },
        { status: 500 },
      );
    }

    const invoices = (invoicesData as InvoiceRow[]).map((invoice) => ({
      id: invoice.id_facture,
      invoiceNumber: invoice.numero_facture,
      orderNumber: orderNumberById.get(invoice.id_commande) ?? null,
      issuedAt: invoice.date_emission,
      totalTtc: toSafeNumber(invoice.montant_ttc),
      status: invoice.statut,
      pdfUrl: invoice.pdf_url,
    }));

    return NextResponse.json({
      invoices,
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue lecture factures compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
