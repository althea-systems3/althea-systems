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

type ResetTokenRow = {
  id_token: string;
  id_utilisateur: string;
  expires_at: string;
  utilise: boolean;
};

type UtilisateurEmailRow = {
  email: string;
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

    // NOTE: Vérifier le token en base (table dédiée)
    const tokenHash = hashToken(rawToken);
    const supabaseAdmin = createAdminClient();

    const { data: tokenRow, error } = await supabaseAdmin
      .from('password_reset_token')
      .select('id_token, id_utilisateur, expires_at, utilise')
      .eq('token_hash', tokenHash)
      .eq('utilise', false)
      .single();

    if (error || !tokenRow) {
      return NextResponse.json(
        { error: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    const token = tokenRow as ResetTokenRow;

    if (isTokenExpired(token.expires_at)) {
      await supabaseAdmin
        .from('password_reset_token')
        .update({ utilise: true } as never)
        .eq('id_token', token.id_token);

      return NextResponse.json(
        { error: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    // NOTE: Récupérer l'email de l'utilisateur pour le log
    const { data: utilisateur } = await supabaseAdmin
      .from('utilisateur')
      .select('email')
      .eq('id_utilisateur', token.id_utilisateur)
      .single();

    const userEmail = (utilisateur as UtilisateurEmailRow | null)?.email ?? '';

    // NOTE: Mettre à jour le mot de passe via Supabase Auth
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(
        token.id_utilisateur,
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

    // NOTE: Marquer le token comme utilisé
    await supabaseAdmin
      .from('password_reset_token')
      .update({ utilise: true } as never)
      .eq('id_token', token.id_token);

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('auth.reset_password', {
      userId: token.id_utilisateur,
      email: userEmail,
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
