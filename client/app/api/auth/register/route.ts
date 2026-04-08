import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCsrf } from '@/lib/auth/csrf';
import { validateRegistrationPayload } from '@/lib/auth/validation';
import { generateVerificationToken, computeTokenExpiry } from '@/lib/auth/token';
import { registerRateLimiter, getClientIp } from '@/lib/auth/rateLimiter';
import { sendVerificationEmail } from '@/lib/auth/email';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import { REGISTER_SUCCESS_MESSAGE } from '@/lib/auth/constants';

// --- Constantes ---

const DUPLICATE_EMAIL_ERROR = 'already been registered';

// --- Helpers ---

function buildVerificationUrl(rawToken: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${baseUrl}/api/auth/verify-email?token=${rawToken}`;
}

// --- Handler ---

export async function POST(request: NextRequest): Promise<NextResponse> {
  // NOTE: Rate limiting
  const clientIp = getClientIp(request);

  if (registerRateLimiter.isRateLimited(clientIp)) {
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
    const validation = validateRegistrationPayload(body);

    if ('errors' in validation) {
      return NextResponse.json(
        { errors: validation.errors },
        { status: 400 },
      );
    }

    const { email, password, nomComplet } = validation.data;
    const supabaseAdmin = createAdminClient();

    // NOTE: Créer l'utilisateur via Supabase Auth (gère le hash bcrypt)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { nom_complet: nomComplet },
      });

    // NOTE: Anti-énumération — même réponse si email déjà pris
    if (authError) {
      if (authError.message?.includes(DUPLICATE_EMAIL_ERROR)) {
        return NextResponse.json(
          { message: REGISTER_SUCCESS_MESSAGE },
          { status: 201 },
        );
      }

      console.error('Erreur création utilisateur Supabase Auth', {
        error: authError.message,
      });

      return NextResponse.json(
        { error: 'Erreur lors de la création du compte.' },
        { status: 500 },
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte.' },
        { status: 500 },
      );
    }

    // NOTE: Générer le token de vérification
    const { rawToken, tokenHash } = generateVerificationToken();
    const tokenExpiry = computeTokenExpiry();

    // NOTE: Mettre à jour le profil utilisateur (trigger a créé la row)
    await supabaseAdmin
      .from('utilisateur')
      .update({
        validation_token_hash: tokenHash,
        validation_token_expires_at: tokenExpiry.toISOString(),
        cgu_acceptee_le: new Date().toISOString(),
      } as never)
      .eq('id_utilisateur', authData.user.id);

    // NOTE: Envoyer l'email de vérification (non bloquant)
    const verificationUrl = buildVerificationUrl(rawToken);

    sendVerificationEmail({
      recipientEmail: email,
      customerName: nomComplet,
      verificationUrl,
    }).catch((emailError) => {
      console.error('Erreur envoi email vérification', { emailError });
    });

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('auth.register', {
      userId: authData.user.id,
      email,
    }).catch(() => {});

    return NextResponse.json(
      { message: REGISTER_SUCCESS_MESSAGE },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur inattendue inscription', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
