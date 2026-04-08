import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import { verifyCsrf } from '@/lib/auth/csrf';
import { logAuthActivity } from '@/lib/auth/logAuthActivity';
import { REMEMBER_ME_COOKIE_NAME } from '@/lib/auth/constants';

// --- Handler ---

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // NOTE: Protection CSRF
  const csrfError = verifyCsrf(request);

  if (csrfError) {
    return csrfError;
  }

  try {
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);

    // NOTE: Récupérer l'utilisateur avant signOut pour le log
    const { data: { user } } = await supabaseClient.auth.getUser();

    await supabaseClient.auth.signOut();

    // NOTE: Supprimer le cookie remember me
    cookieStore.delete(REMEMBER_ME_COOKIE_NAME);

    // NOTE: Journalisation (non bloquant)
    if (user) {
      logAuthActivity('auth.logout', {
        userId: user.id,
      }).catch(() => {});
    }

    return NextResponse.json({ message: 'Déconnexion réussie.' });
  } catch (error) {
    console.error('Erreur inattendue déconnexion', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
