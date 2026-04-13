import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import {
  normalizeString,
  getPaymentMethodUpdateValidationError,
} from '@/lib/account/validation';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';

// --- Types ---

type PaymentMethodRow = {
  id_paiement: string;
  nom_carte: string;
  derniers_4_chiffres: string;
  date_expiration: string;
  est_defaut: boolean;
};

type UpdatePaymentMethodBody = {
  cardHolder?: string;
  expiry?: string;
  isDefault?: boolean;
};

type RouteContext = {
  params: Promise<{ id: string }>;
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const paymentMethodId = normalizeString(id);

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Identifiant methode de paiement invalide', code: 'payment_method_id_invalid' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const validationError = getPaymentMethodUpdateValidationError(body);

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

    const parsedBody = body as UpdatePaymentMethodBody;
    const cardHolder = normalizeString(parsedBody.cardHolder);
    const expiry = normalizeString(parsedBody.expiry);
    const isDefault = parsedBody.isDefault === true;

    const supabaseAdmin = createAdminClient();

    if (isDefault) {
      await supabaseAdmin
        .from('methode_paiement')
        .update({ est_defaut: false } as never)
        .eq('id_utilisateur', auth.userId)
        .eq('est_defaut', true);
    }

    const updatePayload: Record<string, unknown> = {};

    if (cardHolder) {
      updatePayload.nom_carte = cardHolder;
    }

    if (expiry) {
      updatePayload.date_expiration = expiry;
    }

    if (isDefault) {
      updatePayload.est_defaut = true;
    }

    const { data, error } = await supabaseAdmin
      .from('methode_paiement')
      .update(updatePayload as never)
      .eq('id_paiement', paymentMethodId)
      .eq('id_utilisateur', auth.userId)
      .select(
        'id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut',
      )
      .single();

    if (error) {
      console.error('Erreur mise a jour methode paiement compte', {
        error,
        paymentMethodId,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de mettre a jour la methode de paiement', code: 'payment_method_update_failed' },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Methode de paiement introuvable', code: 'payment_method_not_found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      paymentMethod: mapPaymentMethodRow(data as PaymentMethodRow),
    });
  } catch (error) {
    console.error('Erreur inattendue mise a jour methode paiement compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const paymentMethodId = normalizeString(id);

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Identifiant methode de paiement invalide', code: 'payment_method_id_invalid' },
        { status: 400 },
      );
    }

    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('methode_paiement')
      .delete()
      .eq('id_paiement', paymentMethodId)
      .eq('id_utilisateur', auth.userId)
      .select('id_paiement');

    if (error) {
      console.error('Erreur suppression methode paiement compte', {
        error,
        paymentMethodId,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de supprimer la methode de paiement', code: 'payment_method_delete_failed' },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Methode de paiement introuvable', code: 'payment_method_not_found' },
        { status: 404 },
      );
    }

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('account.payment_method_deleted', {
      userId: auth.userId,
      paymentMethodId,
    }).catch(() => {});

    return NextResponse.json({
      message: 'payment_method_deleted',
    });
  } catch (error) {
    console.error('Erreur inattendue suppression methode paiement compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
