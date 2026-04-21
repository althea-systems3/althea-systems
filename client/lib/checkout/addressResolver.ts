import { normalizeString } from "@/lib/admin/common"
import type { createAdminClient } from "@/lib/supabase/admin"

export type AddressInput = {
  savedAddressId?: string
  firstName?: string
  lastName?: string
  address1?: string
  address2?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
  phone?: string
}

export async function resolveAddress(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  addressInput: AddressInput | undefined,
): Promise<string | null> {
  if (!addressInput) {
    return null
  }

  const savedAddressId = normalizeString(addressInput.savedAddressId)

  if (savedAddressId) {
    const { data } = await supabaseAdmin
      .from("adresse")
      .select("id_adresse")
      .eq("id_utilisateur", userId)
      .eq("id_adresse", savedAddressId)
      .single()

    return (data as { id_adresse: string } | null)?.id_adresse ?? null
  }

  const firstName = normalizeString(addressInput.firstName)
  const lastName = normalizeString(addressInput.lastName)
  const address1 = normalizeString(addressInput.address1)
  const city = normalizeString(addressInput.city)
  const postalCode = normalizeString(addressInput.postalCode)
  const country = normalizeString(addressInput.country)
  const phone = normalizeString(addressInput.phone)

  if (
    !firstName ||
    !lastName ||
    !address1 ||
    !city ||
    !postalCode ||
    !country ||
    !phone
  ) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("adresse")
    .insert({
      id_utilisateur: userId,
      prenom: firstName,
      nom: lastName,
      adresse_1: address1,
      adresse_2: normalizeString(addressInput.address2) || null,
      ville: city,
      region: normalizeString(addressInput.region) || null,
      code_postal: postalCode,
      pays: country,
      telephone: phone,
    } as never)
    .select("id_adresse")
    .single()

  if (error || !data) {
    return null
  }

  return (data as { id_adresse: string }).id_adresse
}
