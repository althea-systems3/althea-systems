import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// --- Types ---

type PaymentMethodRow = {
  id_paiement: string;
  nom_carte: string;
  derniers_4_chiffres: string;
  date_expiration: string;
  est_defaut: boolean;
};

type PaymentMethodPayload = {
  id: string;
  cardHolder: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
};

type CreatePaymentMethodBody = {
  stripePaymentId: string;
  cardHolder: string;
  last4: string;
  expiry: string;
  isDefault?: boolean;
};

// --- Helpers ---

function mapPaymentMethodRow(row: PaymentMethodRow): PaymentMethodPayload {
  return {
    id: row.id_paiement,
    cardHolder: row.nom_carte,
    last4: row.derniers_4_chiffres,
    expiry: row.date_expiration,
    isDefault: row.est_defaut,
  };
}

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

const LAST4_LENGTH = 4;

function validateCreateBody(body: unknown): CreatePaymentMethodBody | null {
  const parsed = body as Record<string, unknown> | null;

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const stripePaymentId = normalizeString(parsed.stripePaymentId);
  const cardHolder = normalizeString(parsed.cardHolder);
  const last4 = normalizeString(parsed.last4);
  const expiry = normalizeString(parsed.expiry);

  if (!stripePaymentId || !cardHolder || !last4 || !expiry) {
    return null;
  }

  if (last4.length !== LAST4_LENGTH || !/^\d{4}$/.test(last4)) {
    return null;
  }

  return {
    stripePaymentId,
    cardHolder,
    last4,
    expiry,
    isDefault: parsed.isDefault === true,
  };
}

// --- GET handler ---

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);
    const supabaseAdmin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ paymentMethods: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('methode_paiement')
      .select(
        'id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut',
      )
      .eq('id_utilisateur', user.id)
      .order('est_defaut', { ascending: false });

    if (error || !data) {
      console.error('Erreur lecture méthodes paiement checkout', { error });
      return NextResponse.json({ paymentMethods: [] });
    }

    const paymentMethods = (data as PaymentMethodRow[]).map(
      mapPaymentMethodRow,
    );

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error('Erreur inattendue méthodes paiement checkout', { error });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// --- POST handler ---

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);
    const supabaseAdmin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const validatedBody = validateCreateBody(body);

    if (!validatedBody) {
      return NextResponse.json(
        { error: 'Payload invalide (stripePaymentId, cardHolder, last4, expiry requis)' },
        { status: 400 },
      );
    }

    // NOTE: Si isDefault, retirer le défaut des autres méthodes
    if (validatedBody.isDefault) {
      await supabaseAdmin
        .from('methode_paiement')
        .update({ est_defaut: false } as never)
        .eq('id_utilisateur', user.id)
        .eq('est_defaut', true);
    }

    const { data, error } = await supabaseAdmin
      .from('methode_paiement')
      .insert({
        id_utilisateur: user.id,
        nom_carte: validatedBody.cardHolder,
        derniers_4_chiffres: validatedBody.last4,
        date_expiration: validatedBody.expiry,
        stripe_payment_id: validatedBody.stripePaymentId,
        est_defaut: validatedBody.isDefault ?? false,
      } as never)
      .select(
        'id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut',
      )
      .single();

    if (error || !data) {
      console.error('Erreur création méthode paiement', { error });
      return NextResponse.json(
        { error: 'Impossible de sauvegarder la méthode de paiement' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { paymentMethod: mapPaymentMethodRow(data as PaymentMethodRow) },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur inattendue création méthode paiement', { error });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
