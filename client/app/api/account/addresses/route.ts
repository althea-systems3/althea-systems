import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

type AddressPayload = {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  postalCode: string
  country: string
  phone: string
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function mapAddressRow(row: AddressRow) {
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

function getValidationError(body: unknown): string | null {
  const parsedBody = body as Record<string, unknown> | null

  if (!parsedBody || typeof parsedBody !== "object") {
    return "invalid_payload"
  }

  const requiredKeys: Array<[keyof AddressPayload, string]> = [
    ["firstName", "first_name_required"],
    ["lastName", "last_name_required"],
    ["address1", "address_1_required"],
    ["city", "city_required"],
    ["postalCode", "postal_code_required"],
    ["country", "country_required"],
    ["phone", "phone_required"],
  ]

  for (const [key, code] of requiredKeys) {
    if (!normalizeString(parsedBody[key])) {
      return code
    }
  }

  return null
}

function toInsertPayload(body: AddressPayload) {
  return {
    prenom: normalizeString(body.firstName),
    nom: normalizeString(body.lastName),
    adresse_1: normalizeString(body.address1),
    adresse_2: normalizeString(body.address2) || null,
    ville: normalizeString(body.city),
    code_postal: normalizeString(body.postalCode),
    pays: normalizeString(body.country),
    telephone: normalizeString(body.phone),
  }
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
      return NextResponse.json(
        {
          error: "Session expiree",
          code: "session_expired",
        },
        { status: 401 },
      )
    }

    const { data, error } = await supabaseAdmin
      .from("adresse")
      .select(
        "id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone",
      )
      .eq("id_utilisateur", user.id)
      .order("id_adresse", { ascending: false })

    if (error || !data) {
      console.error("Erreur lecture adresses compte", {
        error,
        userId: user.id,
      })

      return NextResponse.json(
        {
          error: "Impossible de charger les adresses",
          code: "addresses_fetch_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      addresses: (data as AddressRow[]).map(mapAddressRow),
    })
  } catch (error) {
    console.error("Erreur inattendue lecture adresses compte", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const validationError = getValidationError(body)

    if (validationError) {
      return NextResponse.json(
        {
          error: "Adresse invalide",
          code: validationError,
        },
        { status: 400 },
      )
    }

    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const supabaseAdmin = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Session expiree",
          code: "session_expired",
        },
        { status: 401 },
      )
    }

    const payload = body as AddressPayload

    const { data, error } = await supabaseAdmin
      .from("adresse")
      .insert({
        id_utilisateur: user.id,
        ...toInsertPayload(payload),
      } as never)
      .select(
        "id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone",
      )
      .single()

    if (error || !data) {
      console.error("Erreur creation adresse compte", {
        error,
        userId: user.id,
      })

      return NextResponse.json(
        {
          error: "Impossible de creer l'adresse",
          code: "address_create_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        address: mapAddressRow(data as AddressRow),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur inattendue creation adresse compte", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
