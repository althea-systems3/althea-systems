import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import { normalizeString } from '@/lib/account/validation';

// --- Types ---

type RouteContext = {
  params: Promise<{ numero: string }>;
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
  mode_paiement: string | null;
  paiement_dernier_4: string | null;
  id_adresse: string;
};

type ProductRelation =
  | { nom: string | null; slug: string | null }
  | { nom: string | null; slug: string | null }[]
  | null;

type OrderLineRow = {
  id_ligne: string;
  id_produit: string;
  quantite: number;
  prix_unitaire_ht: number | string;
  prix_total_ttc: number | string;
  produit: ProductRelation;
};

type AddressRow = {
  id_adresse: string;
  prenom: string | null;
  nom: string | null;
  adresse_1: string | null;
  adresse_2: string | null;
  ville: string | null;
  code_postal: string | null;
  pays: string | null;
  telephone: string | null;
};

type InvoiceRow = {
  id_facture: string;
  numero_facture: string;
  date_emission: string;
  montant_ttc: number | string;
  statut: string;
  pdf_url: string | null;
};

// --- Helpers ---

function toSafeNumber(value: number | string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProductRelation(
  relation: ProductRelation,
): { name: string | null; slug: string | null } | null {
  if (!relation) {
    return null;
  }

  const product = Array.isArray(relation) ? relation[0] ?? null : relation;

  if (!product) {
    return null;
  }

  return { name: product.nom, slug: product.slug };
}

function maskPaymentLast4(last4: string | null): string | null {
  const safe = normalizeString(last4);

  if (!safe) {
    return null;
  }

  return `**** **** **** ${safe}`;
}

// --- Handler ---

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { numero } = await context.params;
    const orderNumber = normalizeString(numero);

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Numero de commande invalide', code: 'order_number_invalid' },
        { status: 400 },
      );
    }

    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const supabaseAdmin = createAdminClient();

    // --- Fetch order ---

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('commande')
      .select(
        'id_commande, numero_commande, date_commande, montant_ht, montant_tva, montant_ttc, statut, statut_paiement, mode_paiement, paiement_dernier_4, id_adresse',
      )
      .eq('numero_commande', orderNumber)
      .eq('id_utilisateur', auth.userId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: 'Commande introuvable', code: 'order_not_found' },
        { status: 404 },
      );
    }

    const order = orderData as OrderRow;

    // --- Parallel fetch: lines, address, invoice ---

    const [linesResult, invoiceResult] = await Promise.all([
      supabaseAdmin
        .from('ligne_commande')
        .select(
          'id_ligne, id_produit, quantite, prix_unitaire_ht, prix_total_ttc, produit:id_produit(nom, slug)',
        )
        .eq('id_commande', order.id_commande),
      supabaseAdmin
        .from('facture')
        .select(
          'id_facture, numero_facture, date_emission, montant_ttc, statut, pdf_url',
        )
        .eq('id_commande', order.id_commande)
        .order('date_emission', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let address: {
      firstName: string;
      lastName: string;
      address1: string;
      address2: string;
      city: string;
      postalCode: string;
      country: string;
      phone: string;
    } | null = null;

    if (order.id_adresse) {
      const { data: addressData } = await supabaseAdmin
        .from('adresse')
        .select(
          'id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone',
        )
        .eq('id_adresse', order.id_adresse)
        .single();

      if (addressData) {
        const row = addressData as AddressRow;

        address = {
          firstName: row.prenom ?? '',
          lastName: row.nom ?? '',
          address1: row.adresse_1 ?? '',
          address2: row.adresse_2 ?? '',
          city: row.ville ?? '',
          postalCode: row.code_postal ?? '',
          country: row.pays ?? '',
          phone: row.telephone ?? '',
        };
      }
    }

    const lines = ((linesResult.data ?? []) as OrderLineRow[]).map((line) => {
      const product = normalizeProductRelation(line.produit);

      return {
        id: line.id_ligne,
        productId: line.id_produit,
        quantity: line.quantite,
        unitPriceHt: toSafeNumber(line.prix_unitaire_ht),
        totalTtc: toSafeNumber(line.prix_total_ttc),
        product,
      };
    });

    const invoice = invoiceResult.data
      ? {
          invoiceNumber: (invoiceResult.data as InvoiceRow).numero_facture,
          issuedAt: (invoiceResult.data as InvoiceRow).date_emission,
          totalTtc: toSafeNumber(
            (invoiceResult.data as InvoiceRow).montant_ttc,
          ),
          status: (invoiceResult.data as InvoiceRow).statut,
          pdfUrl: (invoiceResult.data as InvoiceRow).pdf_url,
        }
      : null;

    return NextResponse.json({
      order: {
        id: order.id_commande,
        orderNumber: order.numero_commande,
        createdAt: order.date_commande,
        totalHt: toSafeNumber(order.montant_ht),
        totalTva: toSafeNumber(order.montant_tva),
        totalTtc: toSafeNumber(order.montant_ttc),
        status: order.statut,
        paymentStatus: order.statut_paiement,
        paymentMethod: order.mode_paiement,
        paymentLast4: maskPaymentLast4(order.paiement_dernier_4),
      },
      lines,
      address,
      invoice,
    });
  } catch (error) {
    console.error('Erreur inattendue detail commande compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
