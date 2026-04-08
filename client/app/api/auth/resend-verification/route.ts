import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCsrf } from '@/lib/auth/csrf';
import { validateEmail } from '@/lib/auth/validation';
import { generateVerificationToken, computeTokenExpiry } from '@/lib/auth/token';
import { resendRateLimiter, getClientIp } from '@/lib/auth/rateLimiter';
import { sendVerificationEmail } from '@/lib/auth/email';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import { ANTI_ENUMERATION_MESSAGE } from '@/lib/auth/constants';

// --- Types ---

type UtilisateurRow = {
  id_utilisateur: string;
  email: string;
  nom_complet: string;
  email_verifie: boolean;
};

// --- Helpers ---

function buildVerificationUrl(rawToken: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${baseUrl}/api/auth/verify-email?token=${rawToken}`;
}

// --- Handler ---

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // NOTE: Rate limiting
  const clientIp = getClientIp(request);

  if (resendRateLimiter.isRateLimited(clientIp)) {
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
    const emailRaw = parsed?.email;

    const emailError = validateEmail(emailRaw);

    if (emailError) {
      return NextResponse.json(
        { error: emailError },
        { status: 400 },
      );
    }

    const email = (emailRaw as string).trim();
    const supabaseAdmin = createAdminClient();

    // NOTE: Chercher l'utilisateur
    const { data: utilisateur } = await supabaseAdmin
      .from('utilisateur')
      .select('id_utilisateur, email, nom_complet, email_verifie')
      .eq('email', email)
      .single();

    // NOTE: Anti-énumération — même réponse si pas trouvé ou déjà vérifié
    if (!utilisateur) {
      return NextResponse.json(
        { message: ANTI_ENUMERATION_MESSAGE },
      );
    }

    const user = utilisateur as UtilisateurRow;

    if (user.email_verifie) {
      return NextResponse.json(
        { message: ANTI_ENUMERATION_MESSAGE },
      );
    }

    // NOTE: Générer nouveau token
    const { rawToken, tokenHash } = generateVerificationToken();
    const tokenExpiry = computeTokenExpiry();

    await supabaseAdmin
      .from('utilisateur')
      .update({
        validation_token_hash: tokenHash,
        validation_token_expires_at: tokenExpiry.toISOString(),
      } as never)
      .eq('id_utilisateur', user.id_utilisateur);

    // NOTE: Envoyer email (non bloquant)
    const verificationUrl = buildVerificationUrl(rawToken);

    sendVerificationEmail({
      recipientEmail: email,
      customerName: user.nom_complet || 'Utilisateur',
      verificationUrl,
    }).catch((emailError) => {
      console.error('Erreur renvoi email vérification', { emailError });
    });

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('auth.resend_verification', {
      userId: user.id_utilisateur,
      email,
    }).catch(() => {});

    return NextResponse.json(
      { message: ANTI_ENUMERATION_MESSAGE },
    );
  } catch (error) {
    console.error('Erreur inattendue renvoi vérification', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
