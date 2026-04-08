import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCsrf } from '@/lib/auth/csrf';
import { validateEmail } from '@/lib/auth/validation';
import { loginRateLimiter, getClientIp } from '@/lib/auth/rateLimiter';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import {
  USER_STATUS_ACTIVE,
  LOGIN_ACCOUNT_INACTIVE_MESSAGE,
  REMEMBER_ME_COOKIE_NAME,
  REMEMBER_ME_COOKIE_MAX_AGE_SECONDS,
} from '@/lib/auth/constants';

// --- Types ---

type UtilisateurLoginRow = {
  nom_complet: string;
  est_admin: boolean;
  statut: string;
  email_verifie: boolean;
};

// --- Constantes ---

const INVALID_CREDENTIALS_MESSAGE = 'Email ou mot de passe incorrect.';
const EMAIL_NOT_VERIFIED_MESSAGE =
  'Veuillez vérifier votre email avant de vous connecter.';
const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';

// --- Handler ---

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // NOTE: Rate limiting
  const clientIp = getClientIp(request);

  if (loginRateLimiter.isRateLimited(clientIp)) {
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

    const email = typeof parsed.email === 'string' ? parsed.email.trim() : '';
    const password = typeof parsed.mot_de_passe === 'string' ? parsed.mot_de_passe : '';
    const rememberMe = parsed.se_souvenir === true;

    const emailError = validateEmail(email);

    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Mot de passe requis.' },
        { status: 400 },
      );
    }

    // NOTE: Connexion via Supabase Auth (set les cookies JWT automatiquement)
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);

    const { data: signInData, error: signInError } =
      await supabaseClient.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      logAuthActivity('auth.login_failed', { email }).catch(() => {});

      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 },
      );
    }

    // NOTE: Vérifier profil utilisateur via admin client (bypass RLS)
    const supabaseAdmin = createAdminClient();

    const { data: profileData } = await supabaseAdmin
      .from('utilisateur')
      .select('nom_complet, est_admin, statut, email_verifie')
      .eq('id_utilisateur', signInData.user.id)
      .single();

    const profile = profileData as UtilisateurLoginRow | null;

    // NOTE: Bloquer si email non vérifié
    if (profile && !profile.email_verifie) {
      await supabaseClient.auth.signOut();

      return NextResponse.json(
        { error: EMAIL_NOT_VERIFIED_MESSAGE, code: EMAIL_NOT_VERIFIED_CODE },
        { status: 403 },
      );
    }

    // NOTE: Bloquer si compte inactif
    if (profile && profile.statut !== USER_STATUS_ACTIVE) {
      await supabaseClient.auth.signOut();

      return NextResponse.json(
        { error: LOGIN_ACCOUNT_INACTIVE_MESSAGE },
        { status: 403 },
      );
    }

    // NOTE: Cookie remember me
    if (rememberMe) {
      const isProduction = process.env.NODE_ENV === 'production';

      cookieStore.set(REMEMBER_ME_COOKIE_NAME, '1', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: REMEMBER_ME_COOKIE_MAX_AGE_SECONDS,
      });
    }

    // NOTE: Journalisation (non bloquant)
    logAuthActivity('auth.login_success', {
      userId: signInData.user.id,
      email,
    }).catch(() => {});

    return NextResponse.json({
      message: 'Connexion réussie.',
      user: {
        id: signInData.user.id,
        email: signInData.user.email,
        nomComplet: profile?.nom_complet ?? '',
        isAdmin: profile?.est_admin ?? false,
        statut: profile?.statut ?? 'en_attente',
      },
    });
  } catch (error) {
    console.error('Erreur inattendue connexion', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
