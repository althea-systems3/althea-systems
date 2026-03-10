import { createClient } from '@supabase/supabase-js';

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

/**
 * NOTE: Ce client utilise la service_role key pour bypasser le RLS.
 * Réservé aux opérations serveur sans contexte utilisateur
 * (ex: lecture catégories publiques, paniers guest).
 *
 * TODO: Typer avec Database generic une fois les types auto-générés
 * via `npx supabase gen types typescript` disponibles.
 */
export function createAdminClient() {
  if (!cachedAdminClient) {
    cachedAdminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return cachedAdminClient;
}
