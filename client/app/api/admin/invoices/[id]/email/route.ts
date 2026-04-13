import { NextRequest, NextResponse } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { sendInvoiceResendEmail } from '@/lib/checkout/email';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type InvoiceRow = {
  id_facture: string;
  numero_facture: string;
  id_commande: string;
  date_emission: string;
  montant_ttc: number;
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

async function fetchInvoiceById(invoiceId: string): Promise<InvoiceRow | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('facture')
    .select(
      'id_facture, numero_facture, id_commande, date_emission, montant_ttc, pdf_url',
    )
    .eq('id_facture', invoiceId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as InvoiceRow;
}

async function fetchOrderById(orderId: string): Promise<OrderRow | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('commande')
    .select('id_commande, numero_commande, id_utilisateur')
    .eq('id_commande', orderId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as OrderRow;
}

async function fetchUserById(userId: string): Promise<UserRow | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('utilisateur')
    .select('id_utilisateur, nom_complet, email')
    .eq('id_utilisateur', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserRow;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await params;
    const invoiceId = normalizeString(id);

    if (!invoiceId) {
      return NextResponse.json(
        {
          error: 'Identifiant facture invalide.',
          code: 'id_invalid',
        },
        { status: 400 },
      );
    }

    const invoice = await fetchInvoiceById(invoiceId);

    if (!invoice) {
      return NextResponse.json(
        {
          error: 'Facture introuvable.',
          code: 'invoice_not_found',
        },
        { status: 404 },
      );
    }

    const order = await fetchOrderById(invoice.id_commande);

    if (!order) {
      return NextResponse.json(
        {
          error: 'Commande associee introuvable.',
          code: 'order_not_found',
        },
        { status: 404 },
      );
    }

    const user = await fetchUserById(order.id_utilisateur);

    if (!user || !normalizeString(user.email)) {
      return NextResponse.json(
        {
          error: 'Client associe sans email valide.',
          code: 'customer_email_missing',
        },
        { status: 400 },
      );
    }

    await sendInvoiceResendEmail({
      recipientEmail: user.email as string,
      customerName: user.nom_complet || 'Client',
      invoiceNumber: invoice.numero_facture,
      orderNumber: order.numero_commande,
      issueDate: invoice.date_emission,
      totalTtc: Number(invoice.montant_ttc) || 0,
      invoicePdfUrl: invoice.pdf_url,
    });

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'invoices.send_email', {
        invoiceId,
        invoiceNumber: invoice.numero_facture,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur envoi facture email admin', { error });

    return NextResponse.json(
      {
        error: 'Impossible de renvoyer la facture par email.',
        code: 'invoice_send_email_failed',
      },
      { status: 500 },
    );
  }
}
