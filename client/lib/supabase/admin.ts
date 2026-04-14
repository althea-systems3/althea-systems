import { createClient } from "@supabase/supabase-js"

import {
  assertRuntimeConfig,
  SUPABASE_ADMIN_ENV_KEYS,
} from "@/lib/config/runtime"

let cachedAdminClient: ReturnType<typeof createClient> | null = null

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
    assertRuntimeConfig("supabase.admin", SUPABASE_ADMIN_ENV_KEYS)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuration Supabase admin invalide.")
    }

    cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  }
  return cachedAdminClient
}
