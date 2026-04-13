import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthenticatedUser } from '@/lib/account/guards';
import {
  normalizeString,
  getProfileValidationError,
} from '@/lib/account/validation';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// --- Types ---

type UserProfileRow = {
  nom_complet: string | null;
  email: string | null;
};

// --- Helpers ---

function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const normalizedValue = normalizeString(fullName);

  if (!normalizedValue) {
    return { firstName: '', lastName: '' };
  }

  const [firstName, ...remainingParts] = normalizedValue.split(' ');

  return {
    firstName,
    lastName: remainingParts.join(' '),
  };
}

function toMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

// --- Handlers ---

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);
    const supabaseAdmin = createAdminClient();

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { data: profileRow } = await supabaseAdmin
      .from('utilisateur')
      .select('nom_complet, email')
      .eq('id_utilisateur', auth.userId)
      .single();

    const parsedProfileRow = (profileRow ?? null) as UserProfileRow | null;
    const metadata = toMetadataObject(user?.user_metadata);

    const metadataFirstName = normalizeString(metadata.prenom);
    const metadataLastName = normalizeString(metadata.nom);

    const fullNameFromMetadata = normalizeString(metadata.nom_complet);
    const fullNameFromProfile = normalizeString(parsedProfileRow?.nom_complet);
    const splitName = splitFullName(fullNameFromMetadata || fullNameFromProfile);

    const firstName = metadataFirstName || splitName.firstName;
    const lastName = metadataLastName || splitName.lastName;
    const email =
      normalizeString(user?.email) ||
      normalizeString(parsedProfileRow?.email) ||
      '';

    const phone = normalizeString(metadata.telephone);

    return NextResponse.json({
      profile: {
        firstName,
        lastName,
        email,
        phone,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue lecture profil compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const validationError = getProfileValidationError(body);

    if (validationError) {
      return NextResponse.json(
        { error: 'Profil invalide', code: validationError },
        { status: 400 },
      );
    }

    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const parsed = body as Record<string, unknown>;
    const firstName = normalizeString(parsed.firstName);
    const lastName = normalizeString(parsed.lastName);
    const email = normalizeString(parsed.email).toLowerCase();
    const phone = normalizeString(parsed.phone);
    const fullName = `${firstName} ${lastName}`.trim();

    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);
    const supabaseAdmin = createAdminClient();

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const currentMetadata = toMetadataObject(user?.user_metadata);

    const { error: authUpdateError } = await supabaseClient.auth.updateUser({
      ...(normalizeString(user?.email).toLowerCase() !== email ? { email } : {}),
      data: {
        ...currentMetadata,
        nom_complet: fullName,
        prenom: firstName,
        nom: lastName,
        telephone: phone || null,
      },
    });

    if (authUpdateError) {
      const isEmailConflict = authUpdateError.message
        .toLowerCase()
        .includes('already');

      return NextResponse.json(
        {
          error: authUpdateError.message,
          code: isEmailConflict ? 'email_already_used' : 'profile_update_failed',
        },
        { status: isEmailConflict ? 409 : 400 },
      );
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('utilisateur')
      .update({
        nom_complet: fullName,
        email,
      } as never)
      .eq('id_utilisateur', auth.userId);

    if (profileUpdateError) {
      console.error('Erreur mise a jour table utilisateur', {
        profileUpdateError,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de mettre a jour le profil', code: 'profile_update_failed' },
        { status: 500 },
      );
    }

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('account.profile_updated', {
      userId: auth.userId,
    }).catch(() => {});

    return NextResponse.json({
      message: 'profile_updated',
      profile: {
        firstName,
        lastName,
        email,
        phone,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue mise a jour profil compte', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
