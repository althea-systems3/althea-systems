import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type AddressPayload = {
  id: string
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  postalCode: string
  country: string
  phone: string
}

type AddressRow = {
  id_adresse: string
  prenom: string
  nom: string
  adresse_1: string
  adresse_2: string | null
  ville: string
  code_postal: string
  pays: string
  telephone: string | null
}

function mapAddressRow(row: AddressRow): AddressPayload {
  return {
    id: row.id_adresse,
    firstName: row.prenom,
    lastName: row.nom,
    address1: row.adresse_1,
    address2: row.adresse_2 ?? "",
    city: row.ville,
    postalCode: row.code_postal,
    country: row.pays,
    phone: row.telephone ?? "",
  }
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function getAddressValidationError(body: unknown): string | null {
  const parsed = body as Record<string, unknown> | null

  if (!parsed || typeof parsed !== "object") {
    return "Payload adresse invalide"
  }

  const requiredFields: Array<[keyof AddressPayload, string]> = [
    ["firstName", "firstName"],
    ["lastName", "lastName"],
    ["address1", "address1"],
    ["city", "city"],
    ["postalCode", "postalCode"],
    ["country", "country"],
    ["phone", "phone"],
  ]

  for (const [field, fieldLabel] of requiredFields) {
    const value = normalizeString(parsed[field])

    if (!value) {
      return `Champ requis manquant: ${fieldLabel}`
    }
  }

  return null
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const supabaseAdmin = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ addresses: [] })
    }

    const { data, error } = await supabaseAdmin
      .from("adresse")
      .select(
        "id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone",
      )
      .eq("id_utilisateur", user.id)
      .order("id_adresse", { ascending: false })

    if (error || !data) {
      console.error("Erreur lecture adresses checkout", { error })
      return NextResponse.json({ addresses: [] })
    }

    const addresses = (data as AddressRow[]).map(mapAddressRow)

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error("Erreur inattendue adresses checkout", { error })
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const supabaseAdmin = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié" },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => null)
    const validationError = getAddressValidationError(body)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const parsed = body as Record<string, unknown>

    const insertPayload = {
      id_utilisateur: user.id,
      prenom: normalizeString(parsed.firstName),
      nom: normalizeString(parsed.lastName),
      adresse_1: normalizeString(parsed.address1),
      adresse_2: normalizeString(parsed.address2) || null,
      ville: normalizeString(parsed.city),
      code_postal: normalizeString(parsed.postalCode),
      pays: normalizeString(parsed.country),
      telephone: normalizeString(parsed.phone),
    }

    const { data, error } = await supabaseAdmin
      .from("adresse")
      .insert(insertPayload as never)
      .select(
        "id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone",
      )
      .single()

    if (error || !data) {
      console.error("Erreur creation adresse checkout", { error })
      return NextResponse.json(
        { error: "Impossible de créer l'adresse" },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { address: mapAddressRow(data as AddressRow) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur inattendue creation adresse checkout", { error })
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
