import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: userProfile } = await supabaseClient
    .from('utilisateur')
    .select('nom_complet, est_admin, statut, langue_preferee')
    .eq('id_utilisateur', user.id)
    .single();

  return { user, userProfile };
}
