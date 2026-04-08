import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken, isTokenExpired } from '@/lib/auth/token';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import {
  USER_STATUS_ACTIVE,
  INVALID_TOKEN_MESSAGE,
} from '@/lib/auth/constants';

// --- Types ---

type UtilisateurTokenRow = {
  id_utilisateur: string;
  email: string;
  email_verifie: boolean;
  validation_token_expires_at: string | null;
};

// --- Handler ---

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const rawToken = request.nextUrl.searchParams.get('token');

    if (!rawToken || rawToken.length === 0) {
      return NextResponse.json(
        { error: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    const tokenHash = hashToken(rawToken);
    const supabaseAdmin = createAdminClient();

    // NOTE: Chercher l'utilisateur par le hash du token
    const { data: utilisateur, error } = await supabaseAdmin
      .from('utilisateur')
      .select(
        'id_utilisateur, email, email_verifie, validation_token_expires_at',
      )
      .eq('validation_token_hash', tokenHash)
      .single();

    if (error || !utilisateur) {
      return NextResponse.json(
        { error: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    const user = utilisateur as UtilisateurTokenRow;

    // NOTE: Déjà vérifié
    if (user.email_verifie) {
      return NextResponse.redirect(
        new URL('/connexion?verified=already', request.url),
      );
    }

    // NOTE: Token expiré — nettoyer et refuser
    if (
      user.validation_token_expires_at &&
      isTokenExpired(user.validation_token_expires_at)
    ) {
      await supabaseAdmin
        .from('utilisateur')
        .update({
          validation_token_hash: null,
          validation_token_expires_at: null,
        } as never)
        .eq('id_utilisateur', user.id_utilisateur);

      return NextResponse.json(
        { error: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    // NOTE: Activer le compte
    await supabaseAdmin
      .from('utilisateur')
      .update({
        email_verifie: true,
        statut: USER_STATUS_ACTIVE,
        validation_token_hash: null,
        validation_token_expires_at: null,
        date_validation_email: new Date().toISOString(),
      } as never)
      .eq('id_utilisateur', user.id_utilisateur);

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('auth.verify_email', {
      userId: user.id_utilisateur,
      email: user.email,
    }).catch(() => {});

    return NextResponse.redirect(
      new URL('/connexion?verified=true', request.url),
    );
  } catch (error) {
    console.error('Erreur inattendue vérification email', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
