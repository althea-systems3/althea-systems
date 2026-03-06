import { createServerClient as createSupabaseSSRClient } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

/**
 * NOTE: Ce client utilise les cookies de la requête pour maintenir
 * la session Supabase Auth côté serveur (Route Handlers / Server Components).
 */
export function createServerClient(cookieStore: ReadonlyRequestCookies) {
  return createSupabaseSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // NOTE: set() échoue silencieusement dans les Server Components
              // car les cookies sont read-only. C'est attendu et sans impact.
            }
          });
        },
      },
    }
  );
}
