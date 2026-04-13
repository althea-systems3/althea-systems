import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/lib/account/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import {
  isSupportedLanguage,
  getLanguageDir,
} from '@/lib/i18n/constants';

// --- Helpers ---

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

// --- Handlers ---

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Payload invalide.', code: 'invalid_payload' },
        { status: 400 },
      );
    }

    const languePreferee = normalizeString(
      (body as Record<string, unknown>).langue_preferee,
    );

    if (!languePreferee) {
      return NextResponse.json(
        { error: 'Langue requise.', code: 'langue_required' },
        { status: 400 },
      );
    }

    if (!isSupportedLanguage(languePreferee)) {
      return NextResponse.json(
        { error: 'Langue non supportée.', code: 'langue_invalide' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { error: updateError } = await supabaseAdmin
      .from('utilisateur')
      .update({ langue_preferee: languePreferee } as never)
      .eq('id_utilisateur', auth.userId);

    if (updateError) {
      console.error('Erreur mise a jour langue_preferee', {
        updateError,
        userId: auth.userId,
      });

      return NextResponse.json(
        { error: 'Impossible de mettre a jour la preference.', code: 'update_failed' },
        { status: 500 },
      );
    }

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('account.langue_updated', {
      userId: auth.userId,
      langue: languePreferee,
    }).catch(() => {});

    return NextResponse.json({
      message: 'preferences_updated',
      langue_preferee: languePreferee,
      dir: getLanguageDir(languePreferee),
    });
  } catch (error) {
    console.error('Erreur inattendue mise a jour preferences', { error });

    return NextResponse.json(
      { error: 'Erreur serveur', code: 'server_error' },
      { status: 500 },
    );
  }
}
