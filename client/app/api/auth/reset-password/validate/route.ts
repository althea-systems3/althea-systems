import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken, isTokenExpired } from '@/lib/auth/token';
import { INVALID_TOKEN_MESSAGE } from '@/lib/auth/constants';

// --- Types ---

type UtilisateurResetTokenRow = {
  id_utilisateur: string;
  reset_token_expires_at: string | null;
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

    const { data: utilisateur, error } = await supabaseAdmin
      .from('utilisateur')
      .select('id_utilisateur, reset_token_expires_at')
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
      // NOTE: Nettoyer le token expiré
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

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Erreur inattendue validation token reset', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
