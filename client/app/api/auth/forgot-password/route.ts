import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCsrf } from '@/lib/auth/csrf';
import { validateEmail } from '@/lib/auth/validation';
import {
  generateVerificationToken,
  computeResetTokenExpiry,
} from '@/lib/auth/token';
import {
  forgotPasswordRateLimiter,
  getClientIp,
} from '@/lib/auth/rateLimiter';
import { sendPasswordResetEmail } from '@/lib/auth/email';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import { ANTI_ENUMERATION_RESET_MESSAGE } from '@/lib/auth/constants';

// --- Types ---

type UtilisateurResetRow = {
  id_utilisateur: string;
  nom_complet: string;
};

// --- Helpers ---

function buildResetUrl(rawToken: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${baseUrl}/reinitialisation?token=${rawToken}`;
}

// --- Handler ---

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // NOTE: Rate limiting
  const clientIp = getClientIp(request);

  if (forgotPasswordRateLimiter.isRateLimited(clientIp)) {
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

    const email =
      typeof parsed.email === 'string' ? parsed.email.trim() : '';
    const emailError = validateEmail(email);

    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // NOTE: Chercher l'utilisateur — anti-énumération si non trouvé
    const { data: utilisateur } = await supabaseAdmin
      .from('utilisateur')
      .select('id_utilisateur, nom_complet')
      .eq('email', email)
      .single();

    if (!utilisateur) {
      return NextResponse.json({
        message: ANTI_ENUMERATION_RESET_MESSAGE,
      });
    }

    const user = utilisateur as UtilisateurResetRow;

    // NOTE: Générer et stocker le token reset
    const { rawToken, tokenHash } = generateVerificationToken();
    const tokenExpiry = computeResetTokenExpiry();

    await supabaseAdmin
      .from('utilisateur')
      .update({
        reset_token_hash: tokenHash,
        reset_token_expires_at: tokenExpiry.toISOString(),
      } as never)
      .eq('id_utilisateur', user.id_utilisateur);

    // NOTE: Envoyer l'email (non bloquant)
    const resetUrl = buildResetUrl(rawToken);

    sendPasswordResetEmail({
      recipientEmail: email,
      customerName: user.nom_complet,
      resetUrl,
    }).catch((emailError) => {
      console.error('Erreur envoi email réinitialisation', { emailError });
    });

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('auth.forgot_password', {
      userId: user.id_utilisateur,
      email,
    }).catch(() => {});

    return NextResponse.json({
      message: ANTI_ENUMERATION_RESET_MESSAGE,
    });
  } catch (error) {
    console.error('Erreur inattendue forgot-password', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
