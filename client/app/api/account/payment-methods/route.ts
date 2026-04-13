import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import {
  normalizeString,
  getPaymentMethodValidationError,
} from '@/lib/account/validation';

// --- Types ---

type PaymentMethodRow = {
  id_paiement: string;
  nom_carte: string;
  derniers_4_chiffres: string;
  date_expiration: string;
  est_defaut: boolean;
};

type PaymentMethodPayload = {
  stripePaymentId: string;
  cardHolder: string;
  last4: string;
  expiry: string;
  isDefault?: boolean;
};

// --- Helpers ---

function mapPaymentMethodRow(row: PaymentMethodRow) {
  return {
    id: row.id_paiement,
    cardHolder: row.nom_carte,
    last4: row.derniers_4_chiffres,
    expiry: row.date_expiration,
    isDefault: row.est_defaut,
  };
}

// --- Handlers ---

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('methode_paiement')
      .select(
        'id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut',
      )
      .eq('id_utilisateur', auth.userId)
      .order('est_defaut', { ascending: false });

    if (error || !data) {
      console.error('Erreur lecture moyens paiement compte', {
        error,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de charger les moyens de paiement', code: 'payment_methods_fetch_failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      paymentMethods: (data as PaymentMethodRow[]).map(mapPaymentMethodRow),
    });
  } catch (error) {
    console.error('Erreur inattendue lecture moyens paiement compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const validationError = getPaymentMethodValidationError(body);

    if (validationError) {
      return NextResponse.json(
        { error: 'Methode de paiement invalide', code: validationError },
        { status: 400 },
      );
    }

    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const payload = body as PaymentMethodPayload;
    const supabaseAdmin = createAdminClient();
    const isDefault = payload.isDefault === true;

    if (isDefault) {
      await supabaseAdmin
        .from('methode_paiement')
        .update({ est_defaut: false } as never)
        .eq('id_utilisateur', auth.userId)
        .eq('est_defaut', true);
    }

    const { data, error } = await supabaseAdmin
      .from('methode_paiement')
      .insert({
        id_utilisateur: auth.userId,
        nom_carte: normalizeString(payload.cardHolder),
        derniers_4_chiffres: normalizeString(payload.last4),
        date_expiration: normalizeString(payload.expiry),
        stripe_payment_id: normalizeString(payload.stripePaymentId),
        est_defaut: isDefault,
      } as never)
      .select(
        'id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut',
      )
      .single();

    if (error || !data) {
      console.error('Erreur creation methode paiement compte', {
        error,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de creer la methode de paiement', code: 'payment_method_create_failed' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { paymentMethod: mapPaymentMethodRow(data as PaymentMethodRow) },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur inattendue creation methode paiement compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
