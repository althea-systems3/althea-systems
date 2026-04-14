import { createServerClient as createSupabaseSSRClient } from "@supabase/ssr"
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"

import {
  assertRuntimeConfig,
  SUPABASE_SERVER_ENV_KEYS,
} from "@/lib/config/runtime"

/**
 * NOTE: Ce client utilise les cookies de la requête pour maintenir
 * la session Supabase Auth côté serveur (Route Handlers / Server Components).
 */
export function createServerClient(cookieStore: ReadonlyRequestCookies) {
  assertRuntimeConfig("supabase.server", SUPABASE_SERVER_ENV_KEYS)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Configuration Supabase server invalide.")
  }

  return createSupabaseSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // NOTE: set() échoue silencieusement dans les Server Components
            // car les cookies sont read-only. C'est attendu et sans impact.
          }
        })
      },
    },
  })
}
