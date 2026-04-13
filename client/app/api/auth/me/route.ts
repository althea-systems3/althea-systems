import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import {
  REMEMBER_ME_COOKIE_NAME,
  SHORT_SESSION_DURATION_MS,
} from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({
      isAuthenticated: false,
      user: null,
    });
  }

  // NOTE: Si pas de cookie remember_me et session > 2h → signOut
  const rememberMeCookie = cookieStore.get(REMEMBER_ME_COOKIE_NAME);

  if (!rememberMeCookie) {
    const lastSignIn = user.last_sign_in_at
      ? new Date(user.last_sign_in_at).getTime()
      : 0;
    const sessionAge = Date.now() - lastSignIn;

    if (sessionAge > SHORT_SESSION_DURATION_MS) {
      await supabaseClient.auth.signOut();

      return NextResponse.json({
        isAuthenticated: false,
        user: null,
      });
    }
  }

  const { data: userProfile } = await supabaseClient
    .from('utilisateur')
    .select('nom_complet, est_admin, statut, email_verifie, langue_preferee')
    .eq('id_utilisateur', user.id)
    .single();

  return NextResponse.json({
    isAuthenticated: true,
    user: {
      id: user.id,
      email: user.email,
      nomComplet: userProfile?.nom_complet ?? '',
      isAdmin: userProfile?.est_admin ?? false,
      statut: userProfile?.statut ?? 'en_attente',
      emailVerifie: userProfile?.email_verifie ?? false,
      locale: userProfile?.langue_preferee ?? 'fr',
    },
  });
}
