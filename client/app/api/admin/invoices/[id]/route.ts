import { NextRequest, NextResponse } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import {
  CREDIT_NOTE_REASON_CANCELLATION,
  INVOICES_STORAGE_PATH,
} from '@/lib/checkout/constants';
import { buildCreditNoteNumber } from '@/lib/checkout/numberGenerator';
import { generateCreditNotePdf } from '@/lib/checkout/pdf';
import type { CreditNotePdfData } from '@/lib/checkout/pdf';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CreditNoteReason, InvoiceStatus } from '@/lib/supabase/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type InvoiceUpdatePayload = {
  statut?: unknown;
  pdf_url?: unknown;
};

type InvoiceRow = {
  id_facture: string;
  numero_facture: string;
  id_commande: string;
  date_emission: string;
  montant_ttc: number;
  statut: InvoiceStatus;
  pdf_url: string | null;
};

type OrderRow = {
  id_commande: string;
  numero_commande: string;
  id_utilisateur: string;
  date_commande: string;
  statut: string;
  statut_paiement: string;
};

type UserRow = {
  id_utilisateur: string;
  nom_complet: string | null;
  email: string | null;
};

type CreditNoteRow = {
  id_avoir: string;
  numero_avoir: string;
  date_emission: string;
  montant: number;
  motif: CreditNoteReason;
  pdf_url: string | null;
};

function parseInvoiceStatus(value: unknown): InvoiceStatus | null {
  if (value === 'payee' || value === 'en_attente' || value === 'annule') {
    return value;
  }

  return null;
}

function parseOptionalPdfUrl(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

async function fetchInvoice(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  invoiceId: string,
): Promise<InvoiceRow | null> {
  const { data, error } = await supabaseAdmin
    .from('facture')
    .select(
      'id_facture, numero_facture, id_commande, date_emission, montant_ttc, statut, pdf_url',
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
    .select(
      'id_commande, numero_commande, id_utilisateur, date_commande, statut, statut_paiement',
    )
    .eq('id_commande', orderId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as OrderRow;
}

async function fetchUser(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<UserRow | null> {
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

async function fetchCreditNoteByInvoiceId(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  invoiceId: string,
): Promise<CreditNoteRow | null> {
  const { data, error } = await supabaseAdmin
    .from('avoir')
    .select('id_avoir, numero_avoir, date_emission, montant, motif, pdf_url')
    .eq('id_facture', invoiceId)
    .order('date_emission', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CreditNoteRow;
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
    console.error('Erreur generation PDF avoir', { error });
  }

  const { error } = await supabaseAdmin.from('avoir').insert({
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
    .update({ statut: 'annule' } as never)
    .eq('id_facture', invoiceId);

  if (error) {
    console.error('Erreur annulation facture', { error });
  }
}

function toSafeNumber(value: number): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function buildInvoicePayload(params: {
  invoice: InvoiceRow;
  order: OrderRow | null;
  customer: UserRow | null;
  creditNote: CreditNoteRow | null;
}) {
  const { invoice, order, customer, creditNote } = params;

  const history = [
    {
      type: 'emission',
      label: 'Facture emise',
      date: invoice.date_emission,
    },
    ...(creditNote
      ? [
          {
            type: 'annulation',
            label: 'Facture annulee avec creation d avoir',
            date: creditNote.date_emission,
          },
        ]
      : []),
  ];

  return {
    invoice: {
      id_facture: invoice.id_facture,
      numero_facture: invoice.numero_facture,
      date_emission: invoice.date_emission,
      montant_ttc: toSafeNumber(invoice.montant_ttc),
      statut: invoice.statut,
      pdf_url: invoice.pdf_url,
      commande: order
        ? {
            id_commande: order.id_commande,
            numero_commande: order.numero_commande,
            date_commande: order.date_commande,
            statut: order.statut,
            statut_paiement: order.statut_paiement,
          }
        : null,
      client: customer
        ? {
            id_utilisateur: customer.id_utilisateur,
            nom_complet: customer.nom_complet,
            email: customer.email,
          }
        : null,
      creditNote: creditNote
        ? {
            id_avoir: creditNote.id_avoir,
            numero_avoir: creditNote.numero_avoir,
            date_emission: creditNote.date_emission,
            montant: toSafeNumber(creditNote.montant),
            motif: creditNote.motif,
            pdf_url: creditNote.pdf_url,
          }
        : null,
    },
    history,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await context.params;
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

    const supabaseAdmin = createAdminClient();
    const invoice = await fetchInvoice(supabaseAdmin, invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture introuvable', code: 'invoice_not_found' },
        { status: 404 },
      );
    }

    const [order, creditNote] = await Promise.all([
      fetchOrderForInvoice(supabaseAdmin, invoice.id_commande),
      fetchCreditNoteByInvoiceId(supabaseAdmin, invoice.id_facture),
    ]);

    const customer = order
      ? await fetchUser(supabaseAdmin, order.id_utilisateur)
      : null;

    return NextResponse.json(
      buildInvoicePayload({
        invoice,
        order,
        customer,
        creditNote,
      }),
    );
  } catch (error) {
    console.error('Erreur detail facture admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await context.params;
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

    const body = (await request
      .json()
      .catch(() => null)) as InvoiceUpdatePayload | null;

    const hasStatusInPayload = body?.statut !== undefined;
    const hasPdfInPayload = body?.pdf_url !== undefined;

    if (!hasStatusInPayload && !hasPdfInPayload) {
      return NextResponse.json(
        {
          error: 'Aucune modification fournie.',
          code: 'empty_payload',
        },
        { status: 400 },
      );
    }

    const nextStatus = hasStatusInPayload
      ? parseInvoiceStatus(body?.statut)
      : null;
    const nextPdfUrl = parseOptionalPdfUrl(body?.pdf_url);

    if (hasStatusInPayload && !nextStatus) {
      return NextResponse.json(
        {
          error: 'Statut facture invalide.',
          code: 'status_invalid',
        },
        { status: 400 },
      );
    }

    if (hasPdfInPayload && nextPdfUrl === undefined) {
      return NextResponse.json(
        {
          error: 'URL PDF invalide.',
          code: 'pdf_url_invalid',
        },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();
    const existingInvoice = await fetchInvoice(supabaseAdmin, invoiceId);

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Facture introuvable', code: 'invoice_not_found' },
        { status: 404 },
      );
    }

    if (nextStatus === 'annule') {
      const hasCreditNote = await checkExistingCreditNote(
        supabaseAdmin,
        invoiceId,
      );

      if (!hasCreditNote) {
        return NextResponse.json(
          {
            error:
              'Utilisez la suppression de facture pour annuler et generer automatiquement l avoir.',
            code: 'invoice_cancel_requires_delete',
          },
          { status: 400 },
        );
      }
    }

    const updatePayload: { statut?: InvoiceStatus; pdf_url?: string | null } =
      {};

    if (hasStatusInPayload && nextStatus) {
      updatePayload.statut = nextStatus;
    }

    if (hasPdfInPayload) {
      updatePayload.pdf_url = nextPdfUrl ?? null;
    }

    const hasStatusChange =
      updatePayload.statut !== undefined &&
      updatePayload.statut !== existingInvoice.statut;
    const hasPdfChange =
      updatePayload.pdf_url !== undefined &&
      updatePayload.pdf_url !== existingInvoice.pdf_url;

    if (!hasStatusChange && !hasPdfChange) {
      const [order, creditNote] = await Promise.all([
        fetchOrderForInvoice(supabaseAdmin, existingInvoice.id_commande),
        fetchCreditNoteByInvoiceId(supabaseAdmin, existingInvoice.id_facture),
      ]);
      const customer = order
        ? await fetchUser(supabaseAdmin, order.id_utilisateur)
        : null;

      return NextResponse.json(
        buildInvoicePayload({
          invoice: existingInvoice,
          order,
          customer,
          creditNote,
        }),
      );
    }

    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from('facture')
      .update(updatePayload as never)
      .eq('id_facture', invoiceId)
      .select(
        'id_facture, numero_facture, id_commande, date_emission, montant_ttc, statut, pdf_url',
      )
      .single();

    if (updateError || !updatedInvoice) {
      return NextResponse.json(
        {
          error: 'Impossible de mettre a jour la facture.',
          code: 'invoice_update_failed',
        },
        { status: 500 },
      );
    }

    const updatedInvoiceRow = updatedInvoice as InvoiceRow;

    const [order, creditNote] = await Promise.all([
      fetchOrderForInvoice(supabaseAdmin, updatedInvoiceRow.id_commande),
      fetchCreditNoteByInvoiceId(supabaseAdmin, updatedInvoiceRow.id_facture),
    ]);
    const customer = order
      ? await fetchUser(supabaseAdmin, order.id_utilisateur)
      : null;

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'invoices.update', {
        invoiceId,
        previousStatus: existingInvoice.statut,
        nextStatus: updatedInvoiceRow.statut,
        previousPdfUrl: existingInvoice.pdf_url,
        nextPdfUrl: updatedInvoiceRow.pdf_url,
      });
    }

    return NextResponse.json(
      buildInvoicePayload({
        invoice: updatedInvoiceRow,
        order,
        customer,
        creditNote,
      }),
    );
  } catch (error) {
    console.error('Erreur mise a jour facture admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await context.params;
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

    const supabaseAdmin = createAdminClient();
    const invoice = await fetchInvoice(supabaseAdmin, invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture introuvable' },
        { status: 404 },
      );
    }

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

    const order = await fetchOrderForInvoice(
      supabaseAdmin,
      invoice.id_commande,
    );
    const customer = order
      ? await fetchUser(supabaseAdmin, order.id_utilisateur)
      : null;

    const customerName = customer?.nom_complet ?? 'Client';
    const customerEmail = customer?.email ?? '';

    const creditNote = await createCreditNote(
      supabaseAdmin,
      invoice,
      customerName,
      customerEmail,
    );

    if (!creditNote) {
      return NextResponse.json(
        { error: "Impossible de créer l'avoir" },
        { status: 500 },
      );
    }

    await markInvoiceAsCancelled(supabaseAdmin, invoiceId);

    const currentUser = await getCurrentUser();

    logAdminActivity(currentUser?.user.id ?? 'unknown', 'facture_annulee', {
      invoiceId,
      invoiceNumber: invoice.numero_facture,
      creditNoteNumber: creditNote.creditNoteNumber,
      amount: invoice.montant_ttc,
    }).catch(() => {});

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

    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
