import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import { normalizeString } from '@/lib/account/validation';

// --- Types ---

type RouteContext = {
  params: Promise<{ numero: string }>;
};

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
  date_commande: string;
  montant_ht: number | string;
  montant_tva: number | string;
  montant_ttc: number | string;
  statut: string;
  statut_paiement: string;
  id_utilisateur: string;
};

// --- Helpers ---

function toSafeNumber(value: number | string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

// --- Handler ---

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { numero } = await context.params;
    const invoiceNumber = normalizeString(numero);

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: 'Numero de facture invalide', code: 'invoice_number_invalid' },
        { status: 400 },
      );
    }

    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const supabaseAdmin = createAdminClient();

    // --- Fetch invoice ---

    const { data: invoiceData, error: invoiceError } = await supabaseAdmin
      .from('facture')
      .select(
        'id_facture, numero_facture, id_commande, date_emission, montant_ttc, statut, pdf_url',
      )
      .eq('numero_facture', invoiceNumber)
      .single();

    if (invoiceError || !invoiceData) {
      return NextResponse.json(
        { error: 'Facture introuvable', code: 'invoice_not_found' },
        { status: 404 },
      );
    }

    const invoice = invoiceData as InvoiceRow;

    // --- Fetch related order and verify ownership ---

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('commande')
      .select(
        'id_commande, numero_commande, date_commande, montant_ht, montant_tva, montant_ttc, statut, statut_paiement, id_utilisateur',
      )
      .eq('id_commande', invoice.id_commande)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: 'Facture introuvable', code: 'invoice_not_found' },
        { status: 404 },
      );
    }

    const order = orderData as OrderRow;

    if (order.id_utilisateur !== auth.userId) {
      return NextResponse.json(
        { error: 'Facture introuvable', code: 'invoice_not_found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      invoice: {
        id: invoice.id_facture,
        invoiceNumber: invoice.numero_facture,
        issuedAt: invoice.date_emission,
        totalTtc: toSafeNumber(invoice.montant_ttc),
        status: invoice.statut,
        pdfUrl: invoice.pdf_url,
      },
      order: {
        orderNumber: order.numero_commande,
        createdAt: order.date_commande,
        totalHt: toSafeNumber(order.montant_ht),
        totalTva: toSafeNumber(order.montant_tva),
        totalTtc: toSafeNumber(order.montant_ttc),
        status: order.statut,
        paymentStatus: order.statut_paiement,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue detail facture compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
