import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/

type PaymentMethodRow = {
  id_paiement: string
  nom_carte: string
  derniers_4_chiffres: string
  date_expiration: string
  est_defaut: boolean
}

type UpdatePaymentMethodBody = {
  cardHolder?: string
  expiry?: string
  isDefault?: boolean
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

function mapPaymentMethodRow(row: PaymentMethodRow) {
  return {
    id: row.id_paiement,
    cardHolder: row.nom_carte,
    last4: row.derniers_4_chiffres,
    expiry: row.date_expiration,
    isDefault: row.est_defaut,
  }
}

function getValidationError(body: unknown): string | null {
  const parsedBody = body as UpdatePaymentMethodBody | null

  if (!parsedBody || typeof parsedBody !== "object") {
    return "invalid_payload"
  }

  const cardHolder = normalizeString(parsedBody.cardHolder)
  const expiry = normalizeString(parsedBody.expiry)
  const shouldSetDefault = parsedBody.isDefault === true

  if (!cardHolder && !expiry && !shouldSetDefault) {
    return "no_changes_requested"
  }

  if (expiry && !EXPIRY_PATTERN.test(expiry)) {
    return "expiry_invalid"
  }

  return null
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const paymentMethodId = normalizeString(id)

    if (!paymentMethodId) {
      return NextResponse.json(
        {
          error: "Identifiant methode de paiement invalide",
          code: "payment_method_id_invalid",
        },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => null)
    const validationError = getValidationError(body)

    if (validationError) {
      return NextResponse.json(
        {
          error: "Methode de paiement invalide",
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
    const parsedBody = body as UpdatePaymentMethodBody
    const cardHolder = normalizeString(parsedBody.cardHolder)
    const expiry = normalizeString(parsedBody.expiry)
    const isDefault = parsedBody.isDefault === true

    const supabaseAdmin = createAdminClient()

    if (isDefault) {
      await supabaseAdmin
        .from("methode_paiement")
        .update({ est_defaut: false } as never)
        .eq("id_utilisateur", userId)
        .eq("est_defaut", true)
    }

    const updatePayload: Record<string, unknown> = {}

    if (cardHolder) {
      updatePayload.nom_carte = cardHolder
    }

    if (expiry) {
      updatePayload.date_expiration = expiry
    }

    if (isDefault) {
      updatePayload.est_defaut = true
    }

    const { data, error } = await supabaseAdmin
      .from("methode_paiement")
      .update(updatePayload as never)
      .eq("id_paiement", paymentMethodId)
      .eq("id_utilisateur", userId)
      .select(
        "id_paiement, nom_carte, derniers_4_chiffres, date_expiration, est_defaut",
      )
      .single()

    if (error) {
      console.error("Erreur mise a jour methode paiement compte", {
        error,
        paymentMethodId,
        userId,
      })

      return NextResponse.json(
        {
          error: "Impossible de mettre a jour la methode de paiement",
          code: "payment_method_update_failed",
        },
        { status: 500 },
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Methode de paiement introuvable",
          code: "payment_method_not_found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      paymentMethod: mapPaymentMethodRow(data as PaymentMethodRow),
    })
  } catch (error) {
    console.error("Erreur inattendue mise a jour methode paiement compte", {
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const paymentMethodId = normalizeString(id)

    if (!paymentMethodId) {
      return NextResponse.json(
        {
          error: "Identifiant methode de paiement invalide",
          code: "payment_method_id_invalid",
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
      .from("methode_paiement")
      .delete()
      .eq("id_paiement", paymentMethodId)
      .eq("id_utilisateur", userId)
      .select("id_paiement")

    if (error) {
      console.error("Erreur suppression methode paiement compte", {
        error,
        paymentMethodId,
        userId,
      })

      return NextResponse.json(
        {
          error: "Impossible de supprimer la methode de paiement",
          code: "payment_method_delete_failed",
        },
        { status: 500 },
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: "Methode de paiement introuvable",
          code: "payment_method_not_found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      message: "payment_method_deleted",
    })
  } catch (error) {
    console.error("Erreur inattendue suppression methode paiement compte", {
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
