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

type RouteContext = {
  params: Promise<{ id: string }>
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

function toUpdatePayload(body: AddressPayload) {
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

async function getAuthenticatedUserId(): Promise<
  | {
      userId: string
      response: null
    }
  | {
      userId: null
      response: NextResponse
    }
> {
  const cookieStore = await cookies()
  const supabaseClient = createServerClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    return {
      userId: null,
      response: NextResponse.json(
        {
          error: "Session expiree",
          code: "session_expired",
        },
        { status: 401 },
      ),
    }
  }

  return {
    userId: user.id,
    response: null,
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const addressId = normalizeString(id)

    if (!addressId) {
      return NextResponse.json(
        {
          error: "Identifiant adresse invalide",
          code: "address_id_invalid",
        },
        { status: 400 },
      )
    }

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

    const authenticatedState = await getAuthenticatedUserId()

    if (authenticatedState.response) {
      return authenticatedState.response
    }

    const userId = authenticatedState.userId as string
    const payload = body as AddressPayload
    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin
      .from("adresse")
      .update(toUpdatePayload(payload) as never)
      .eq("id_adresse", addressId)
      .eq("id_utilisateur", userId)
      .select(
        "id_adresse, prenom, nom, adresse_1, adresse_2, ville, code_postal, pays, telephone",
      )
      .single()

    if (error) {
      console.error("Erreur mise a jour adresse compte", {
        error,
        addressId,
        userId,
      })

      return NextResponse.json(
        {
          error: "Impossible de mettre a jour l'adresse",
          code: "address_update_failed",
        },
        { status: 500 },
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Adresse introuvable",
          code: "address_not_found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      address: mapAddressRow(data as AddressRow),
    })
  } catch (error) {
    console.error("Erreur inattendue mise a jour adresse compte", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const addressId = normalizeString(id)

    if (!addressId) {
      return NextResponse.json(
        {
          error: "Identifiant adresse invalide",
          code: "address_id_invalid",
        },
        { status: 400 },
      )
    }

    const authenticatedState = await getAuthenticatedUserId()

    if (authenticatedState.response) {
      return authenticatedState.response
    }

    const userId = authenticatedState.userId as string
    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin
      .from("adresse")
      .delete()
      .eq("id_adresse", addressId)
      .eq("id_utilisateur", userId)
      .select("id_adresse")

    if (error) {
      console.error("Erreur suppression adresse compte", {
        error,
        addressId,
        userId,
      })

      return NextResponse.json(
        {
          error: "Impossible de supprimer l'adresse",
          code: "address_delete_failed",
        },
        { status: 500 },
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: "Adresse introuvable",
          code: "address_not_found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      message: "address_deleted",
    })
  } catch (error) {
    console.error("Erreur inattendue suppression adresse compte", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
