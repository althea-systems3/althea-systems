import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCsrf } from '@/lib/auth/csrf';
import { validatePassword } from '@/lib/auth/validation';
import { hashToken, isTokenExpired } from '@/lib/auth/token';
import {
  resetPasswordRateLimiter,
  getClientIp,
} from '@/lib/auth/rateLimiter';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import { INVALID_TOKEN_MESSAGE } from '@/lib/auth/constants';

// --- Types ---

type UtilisateurResetTokenRow = {
  id_utilisateur: string;
  email: string;
  reset_token_expires_at: string | null;
};

// --- Constantes ---

const PASSWORD_RESET_SUCCESS_MESSAGE =
  'Mot de passe réinitialisé avec succès.';

// --- Handler ---

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // NOTE: Rate limiting
  const clientIp = getClientIp(request);

  if (resetPasswordRateLimiter.isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429 },
    );
  }

  // NOTE: Protection CSRF
  const csrfError = verifyCsrf(request);

  if (csrfError) {
    return csrfError;
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = body as Record<string, unknown> | null;

    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json(
        { error: 'Payload invalide.' },
        { status: 400 },
      );
    }

    const rawToken =
      typeof parsed.token === 'string' ? parsed.token : '';
    const password =
      typeof parsed.mot_de_passe === 'string' ? parsed.mot_de_passe : '';
    const confirmation =
      typeof parsed.mot_de_passe_confirmation === 'string'
        ? parsed.mot_de_passe_confirmation
        : '';

    // NOTE: Valider le token
    if (!rawToken) {
      return NextResponse.json(
        { error: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    // NOTE: Valider le mot de passe
    const passwordError = validatePassword(password);

    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 },
      );
    }

    if (password !== confirmation) {
      return NextResponse.json(
        { error: 'Les mots de passe ne correspondent pas.' },
        { status: 400 },
      );
    }

    // NOTE: Vérifier le token en base
    const tokenHash = hashToken(rawToken);
    const supabaseAdmin = createAdminClient();

    const { data: utilisateur, error } = await supabaseAdmin
      .from('utilisateur')
      .select('id_utilisateur, email, reset_token_expires_at')
      .eq('reset_token_hash', tokenHash)
      .single();

    if (error || !utilisateur) {
      return NextResponse.json(
        { error: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    const user = utilisateur as UtilisateurResetTokenRow;

    if (
      user.reset_token_expires_at &&
      isTokenExpired(user.reset_token_expires_at)
    ) {
      await supabaseAdmin
        .from('utilisateur')
        .update({
          reset_token_hash: null,
          reset_token_expires_at: null,
        } as never)
        .eq('id_utilisateur', user.id_utilisateur);

      return NextResponse.json(
        { error: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    // NOTE: Mettre à jour le mot de passe via Supabase Auth
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(
        user.id_utilisateur,
        { password },
      );

    if (updateError) {
      console.error('Erreur mise à jour mot de passe', {
        error: updateError.message,
      });
      return NextResponse.json(
        { error: 'Erreur serveur' },
        { status: 500 },
      );
    }

    // NOTE: Nettoyer les colonnes reset token
    await supabaseAdmin
      .from('utilisateur')
      .update({
        reset_token_hash: null,
        reset_token_expires_at: null,
      } as never)
      .eq('id_utilisateur', user.id_utilisateur);

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('auth.reset_password', {
      userId: user.id_utilisateur,
      email: user.email,
    }).catch(() => {});

    return NextResponse.json({
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    });
  } catch (error) {
    console.error('Erreur inattendue reset-password', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
