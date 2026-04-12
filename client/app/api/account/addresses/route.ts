import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import {
  normalizeString,
  getAddressValidationError,
} from '@/lib/account/validation';

// --- Types ---

type AddressRow = {
  id_adresse: string;
  prenom: string;
  nom: string;
  adresse_1: string;
  adresse_2: string | null;
  ville: string;
  code_postal: string;
  pays: string;
  telephone: string | null;
};

type AddressPayload = {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
};

// --- Helpers ---

function mapAddressRow(row: AddressRow) {
  return {
    id: row.id_adresse,
    firstName: row.prenom,
    lastName: row.nom,
    address1: row.adresse_1,
    address2: row.adresse_2 ?? '',
    city: row.ville,
    postalCode: row.code_postal,
    country: row.pays,
    phone: row.telephone ?? '',
  };
}

function toInsertPayload(body: AddressPayload) {
  return {
    prenom: normalizeString(body.firstName),
    nom: normalizeString(body.lastName),
    adresse_1: normalizeString(body.address1),
    adresse_2: normalizeString(body.address2) || null,
    ville: normalizeString(body.city),
    code_postal: normalizeString(body.postalCode),
    pays: normalizeString(body.country),
    telephone: normalizeString(body.phone),
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
      .from('adresse')
      .select(
        'id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone',
      )
      .eq('id_utilisateur', auth.userId)
      .order('id_adresse', { ascending: false });

    if (error || !data) {
      console.error('Erreur lecture adresses compte', {
        error,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de charger les adresses', code: 'addresses_fetch_failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      addresses: (data as AddressRow[]).map(mapAddressRow),
    });
  } catch (error) {
    console.error('Erreur inattendue lecture adresses compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const validationError = getAddressValidationError(body);

    if (validationError) {
      return NextResponse.json(
        { error: 'Adresse invalide', code: validationError },
        { status: 400 },
      );
    }

    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const payload = body as AddressPayload;
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('adresse')
      .insert({
        id_utilisateur: auth.userId,
        ...toInsertPayload(payload),
      } as never)
      .select(
        'id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone',
      )
      .single();

    if (error || !data) {
      console.error('Erreur creation adresse compte', {
        error,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de creer l\'adresse', code: 'address_create_failed' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { address: mapAddressRow(data as AddressRow) },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur inattendue creation adresse compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
