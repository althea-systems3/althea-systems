import {
  GUEST_USER_DEFAULT_NAME,
  GUEST_USER_DEFAULT_STATUS,
} from "@/lib/checkout/constants"
import type { createAdminClient } from "@/lib/supabase/admin"

export async function findOrCreateGuestUser(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  guestEmail: string,
): Promise<string | null> {
  const { data: existingUser } = await supabaseAdmin
    .from("utilisateur")
    .select("id_utilisateur")
    .eq("email", guestEmail)
    .limit(1)
    .single()

  if (existingUser) {
    return (existingUser as { id_utilisateur: string }).id_utilisateur
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      email_confirm: true,
      user_metadata: { nom_complet: GUEST_USER_DEFAULT_NAME },
    })

  if (authError || !authData.user) {
    console.error("Erreur création user guest", { authError })
    return null
  }

  await supabaseAdmin
    .from("utilisateur")
    .update({
      statut: GUEST_USER_DEFAULT_STATUS,
      nom_complet: GUEST_USER_DEFAULT_NAME,
    } as never)
    .eq("id_utilisateur", authData.user.id)

  return authData.user.id
}
