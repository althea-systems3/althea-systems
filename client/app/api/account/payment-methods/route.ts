import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const LAST4_PATTERN = /^\d{4}$/
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/

type PaymentMethodRow = {
  id_paiement: string
  nom_carte: string
  derniers_4_chiffres: string
  date_expiration: string
  est_defaut: boolean
}

type PaymentMethodPayload = {
  stripePaymentId: string
  cardHolder: string
  last4: string
  expiry: string
  isDefault?: boolean
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function mapPaymentMethodRow(row: PaymentMethodRow) {
  return {
    id: row.id_paiement,
    cardHolder: row.nom_carte,
    last4: row.derniers_4_chiffres,
    expiry: row.date_expiration,
    isDefault: row.est_defaut,
  }
}

function validatePayload(body: unknown): string | null {
  const parsedBody = body as Record<string, unknown> | null

  if (!parsedBody || typeof parsedBody !== "object") {
    return "invalid_payload"
  }

  const stripePaymentId = normalizeString(parsedBody.stripePaymentId)
  const cardHolder = normalizeString(parsedBody.cardHolder)
  const last4 = normalizeString(parsedBody.last4)
  const expiry = normalizeString(parsedBody.expiry)

  if (!stripePaymentId) {
    return "stripe_payment_id_required"
  }

  if (!cardHolder) {
    return "card_holder_required"
  }

  if (!LAST4_PATTERN.test(last4)) {
    return "last4_invalid"
  }

  if (!EXPIRY_PATTERN.test(expiry)) {
    return "expiry_invalid"
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
      return NextResponse.json(
        {
          error: "Session expiree",
          code: "session_expired",
        },
        { status: 401 },
      )
    }

    const { data, error } = await supabaseAdmin
      .from("methode_paiement")
      .select(
        "id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut",
      )
      .eq("id_utilisateur", user.id)
      .order("est_defaut", { ascending: false })

    if (error || !data) {
      console.error("Erreur lecture moyens paiement compte", {
        error,
        userId: user.id,
      })

      return NextResponse.json(
        {
          error: "Impossible de charger les moyens de paiement",
          code: "payment_methods_fetch_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      paymentMethods: (data as PaymentMethodRow[]).map(mapPaymentMethodRow),
    })
  } catch (error) {
    console.error("Erreur inattendue lecture moyens paiement compte", { error })

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
    const validationError = validatePayload(body)

    if (validationError) {
      return NextResponse.json(
        {
          error: "Methode de paiement invalide",
          code: validationError,
        },
        { status: 400 },
      )
    }

    const payload = body as PaymentMethodPayload
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

    const isDefault = payload.isDefault === true

    if (isDefault) {
      await supabaseAdmin
        .from("methode_paiement")
        .update({ est_defaut: false } as never)
        .eq("id_utilisateur", user.id)
        .eq("est_defaut", true)
    }

    const { data, error } = await supabaseAdmin
      .from("methode_paiement")
      .insert({
        id_utilisateur: user.id,
        nom_carte: normalizeString(payload.cardHolder),
        derniers_4_chiffres: normalizeString(payload.last4),
        date_expiration: normalizeString(payload.expiry),
        stripe_payment_id: normalizeString(payload.stripePaymentId),
        est_defaut: isDefault,
      } as never)
      .select(
        "id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut",
      )
      .single()

    if (error || !data) {
      console.error("Erreur creation methode paiement compte", {
        error,
        userId: user.id,
      })

      return NextResponse.json(
        {
          error: "Impossible de creer la methode de paiement",
          code: "payment_method_create_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        paymentMethod: mapPaymentMethodRow(data as PaymentMethodRow),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur inattendue creation methode paiement compte", {
      error,
    })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
