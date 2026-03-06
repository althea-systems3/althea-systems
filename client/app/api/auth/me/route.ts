import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';

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

  const { data: userProfile } = await supabaseClient
    .from('utilisateur')
    .select('nom_complet, est_admin, statut')
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
      locale: user.user_metadata?.locale ?? 'fr',
    },
  });
}
