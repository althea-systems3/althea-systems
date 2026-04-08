import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d\s().-]{6,20}$/

type ProfilePayload = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

type UserProfileRow = {
  nom_complet: string | null
  email: string | null
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function splitFullName(fullName: string): {
  firstName: string
  lastName: string
} {
  const normalizedValue = normalizeString(fullName)

  if (!normalizedValue) {
    return {
      firstName: "",
      lastName: "",
    }
  }

  const [firstName, ...remainingParts] = normalizedValue.split(" ")

  return {
    firstName,
    lastName: remainingParts.join(" "),
  }
}

function getValidationError(payload: unknown): string | null {
  const parsedPayload = payload as Record<string, unknown> | null

  if (!parsedPayload || typeof parsedPayload !== "object") {
    return "invalid_payload"
  }

  const firstName = normalizeString(parsedPayload.firstName)
  const lastName = normalizeString(parsedPayload.lastName)
  const email = normalizeString(parsedPayload.email).toLowerCase()
  const phone = normalizeString(parsedPayload.phone)

  if (!firstName) {
    return "first_name_required"
  }

  if (!lastName) {
    return "last_name_required"
  }

  if (!email) {
    return "email_required"
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "email_invalid"
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    return "phone_invalid"
  }

  return null
}

function toMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {}
  }

  return value as Record<string, unknown>
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

    const { data: profileRow } = await supabaseAdmin
      .from("utilisateur")
      .select("nom_complet, email")
      .eq("id_utilisateur", user.id)
      .single()

    const parsedProfileRow = (profileRow ?? null) as UserProfileRow | null
    const metadata = toMetadataObject(user.user_metadata)

    const metadataFirstName = normalizeString(metadata.prenom)
    const metadataLastName = normalizeString(metadata.nom)

    const fullNameFromMetadata = normalizeString(metadata.nom_complet)
    const fullNameFromProfile = normalizeString(parsedProfileRow?.nom_complet)
    const splitName = splitFullName(fullNameFromMetadata || fullNameFromProfile)

    const firstName = metadataFirstName || splitName.firstName
    const lastName = metadataLastName || splitName.lastName
    const email =
      normalizeString(user.email) ||
      normalizeString(parsedProfileRow?.email) ||
      ""

    const phone = normalizeString(metadata.telephone)

    return NextResponse.json({
      profile: {
        firstName,
        lastName,
        email,
        phone,
      },
    })
  } catch (error) {
    console.error("Erreur inattendue lecture profil compte", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const validationError = getValidationError(body)

    if (validationError) {
      return NextResponse.json(
        {
          error: "Profil invalide",
          code: validationError,
        },
        { status: 400 },
      )
    }

    const parsedBody = body as ProfilePayload
    const firstName = normalizeString(parsedBody.firstName)
    const lastName = normalizeString(parsedBody.lastName)
    const email = normalizeString(parsedBody.email).toLowerCase()
    const phone = normalizeString(parsedBody.phone)
    const fullName = `${firstName} ${lastName}`.trim()

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

    const currentMetadata = toMetadataObject(user.user_metadata)

    const { error: authUpdateError } = await supabaseClient.auth.updateUser({
      ...(normalizeString(user.email).toLowerCase() !== email ? { email } : {}),
      data: {
        ...currentMetadata,
        nom_complet: fullName,
        prenom: firstName,
        nom: lastName,
        telephone: phone || null,
      },
    })

    if (authUpdateError) {
      const isEmailConflict = authUpdateError.message
        .toLowerCase()
        .includes("already")

      return NextResponse.json(
        {
          error: authUpdateError.message,
          code: isEmailConflict
            ? "email_already_used"
            : "profile_update_failed",
        },
        { status: isEmailConflict ? 409 : 400 },
      )
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from("utilisateur")
      .update({
        nom_complet: fullName,
        email,
      } as never)
      .eq("id_utilisateur", user.id)

    if (profileUpdateError) {
      console.error("Erreur mise a jour table utilisateur", {
        profileUpdateError,
        userId: user.id,
      })

      return NextResponse.json(
        {
          error: "Impossible de mettre a jour le profil",
          code: "profile_update_failed",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      message: "profile_updated",
      profile: {
        firstName,
        lastName,
        email,
        phone,
      },
    })
  } catch (error) {
    console.error("Erreur inattendue mise a jour profil compte", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
