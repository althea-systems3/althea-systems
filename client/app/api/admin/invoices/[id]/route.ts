import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { buildCreditNoteNumber } from '@/lib/checkout/numberGenerator';
import { generateCreditNotePdf } from '@/lib/checkout/pdf';
import type { CreditNotePdfData } from '@/lib/checkout/pdf';
import {
  CREDIT_NOTE_REASON_CANCELLATION,
  INVOICES_STORAGE_PATH,
} from '@/lib/checkout/constants';

// --- Types ---

type InvoiceRow = {
  id_facture: string;
  numero_facture: string;
  id_commande: string;
  montant_ttc: number;
  statut: string;
  pdf_url: string | null;
};

type OrderRow = {
  id_commande: string;
  numero_commande: string;
  id_utilisateur: string;
};

type UserRow = {
  nom_complet: string;
  email: string;
};

// --- Helpers ---

async function fetchInvoice(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  invoiceId: string,
): Promise<InvoiceRow | null> {
  const { data, error } = await supabaseAdmin
    .from('facture')
    .select(
      'id_facture, numero_facture, id_commande, montant_ttc, statut, pdf_url',
    )
    .eq('id_facture', invoiceId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as InvoiceRow;
}

async function fetchOrderForInvoice(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<OrderRow | null> {
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

async function fetchUserEmail(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<UserRow | null> {
  const { data, error } = await supabaseAdmin
    .from('utilisateur')
    .select('nom_complet, email')
    .eq('id_utilisateur', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserRow;
}

async function checkExistingCreditNote(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  invoiceId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('avoir')
    .select('id_avoir')
    .eq('id_facture', invoiceId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function uploadCreditNotePdf(
  creditNoteNumber: string,
  pdfBuffer: Buffer,
): Promise<string | null> {
  try {
    const admin = await import('firebase-admin');
    const bucket = admin.default.storage().bucket();
    const filePath = `${INVOICES_STORAGE_PATH}/${creditNoteNumber}.pdf`;
    const file = bucket.file(filePath);

    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: { documentNumber: creditNoteNumber },
    });

    await file.makePublic();

    return file.publicUrl();
  } catch (error) {
    console.error('Erreur upload PDF avoir', { error });
    return null;
  }
}

async function createCreditNote(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  invoice: InvoiceRow,
  customerName: string,
  customerEmail: string,
): Promise<{ creditNoteNumber: string; pdfUrl: string | null } | null> {
  const creditNoteNumber = buildCreditNoteNumber();

  const creditNoteData: CreditNotePdfData = {
    creditNoteNumber,
    invoiceNumber: invoice.numero_facture,
    issueDate: new Date().toISOString(),
    amount: invoice.montant_ttc,
    reason: CREDIT_NOTE_REASON_CANCELLATION,
    customerName,
    customerEmail,
  };

  let pdfUrl: string | null = null;

  try {
    const pdfBuffer = await generateCreditNotePdf(creditNoteData);
    pdfUrl = await uploadCreditNotePdf(creditNoteNumber, pdfBuffer);
  } catch (error) {
    console.error('Erreur génération PDF avoir', { error });
  }

  const { error } = await supabaseAdmin
    .from('avoir')
    .insert({
      numero_avoir: creditNoteNumber,
      id_facture: invoice.id_facture,
      montant: invoice.montant_ttc,
      motif: CREDIT_NOTE_REASON_CANCELLATION,
      pdf_url: pdfUrl,
    } as never);

  if (error) {
    console.error('Erreur insertion avoir', { error });
    return null;
  }

  return { creditNoteNumber, pdfUrl };
}

async function markInvoiceAsCancelled(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  invoiceId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('facture')
    .update({ statut: 'annulee' } as never)
    .eq('id_facture', invoiceId);

  if (error) {
    console.error('Erreur annulation facture', { error });
  }
}

// --- Handler ---

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const adminError = await verifyAdminAccess();

  if (adminError) {
    return adminError;
  }

  try {
    const { id: invoiceId } = await context.params;
    const supabaseAdmin = createAdminClient();

    // NOTE: Vérifier que la facture existe
    const invoice = await fetchInvoice(supabaseAdmin, invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture introuvable' },
        { status: 404 },
      );
    }

    // NOTE: Vérifier qu'un avoir n'existe pas déjà
    const hasExistingCreditNote = await checkExistingCreditNote(
      supabaseAdmin,
      invoiceId,
    );

    if (hasExistingCreditNote) {
      return NextResponse.json(
        { error: 'Un avoir existe déjà pour cette facture' },
        { status: 409 },
      );
    }

    // NOTE: Récupérer infos commande et client
    const order = await fetchOrderForInvoice(
      supabaseAdmin,
      invoice.id_commande,
    );

    const customerInfo = order
      ? await fetchUserEmail(supabaseAdmin, order.id_utilisateur)
      : null;

    const customerName = customerInfo?.nom_complet ?? 'Client';
    const customerEmail = customerInfo?.email ?? '';

    // NOTE: Créer l'avoir avec PDF
    const creditNote = await createCreditNote(
      supabaseAdmin,
      invoice,
      customerName,
      customerEmail,
    );

    if (!creditNote) {
      return NextResponse.json(
        { error: 'Impossible de créer l\'avoir' },
        { status: 500 },
      );
    }

    // NOTE: Marquer la facture comme annulée
    await markInvoiceAsCancelled(supabaseAdmin, invoiceId);

    // NOTE: Log admin (non bloquant)
    const currentUser = await getCurrentUser();

    logAdminActivity(
      currentUser?.user.id ?? 'unknown',
      'facture_annulee',
      {
        invoiceId,
        invoiceNumber: invoice.numero_facture,
        creditNoteNumber: creditNote.creditNoteNumber,
        amount: invoice.montant_ttc,
      },
    ).catch(() => {});

    return NextResponse.json({
      message: 'Facture annulée, avoir créé automatiquement',
      creditNote: {
        number: creditNote.creditNoteNumber,
        amount: invoice.montant_ttc,
        pdfUrl: creditNote.pdfUrl,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue suppression facture', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
