import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { sanitizeText } from "@/lib/auth/sanitize"
import {
  hasContactFormErrors,
  normalizeContactText,
  validateContactForm,
} from "@/lib/contact/validation"
import { sendContactFormNotificationEmail } from "@/lib/checkout/email"

type ContactRequestBody = {
  email?: unknown
  subject?: unknown
  message?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as ContactRequestBody | null

    const values = {
      email: normalizeContactText(body?.email),
      subject: normalizeContactText(body?.subject),
      message: normalizeContactText(body?.message),
    }

    const validationErrors = validateContactForm(values)

    if (hasContactFormErrors(validationErrors)) {
      return NextResponse.json(
        {
          error: "Le formulaire contient des champs invalides.",
          code: "invalid_contact_payload",
          fieldErrors: validationErrors,
        },
        { status: 400 },
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin
      .from("message_contact")
      .insert({
        email: values.email,
        sujet: sanitizeText(values.subject, 200),
        contenu: sanitizeText(values.message, 5000),
      } as never)
      .select("id_message")
      .single()

    if (error || !data) {
      console.error("Erreur insertion message_contact", { error })

      return NextResponse.json(
        {
          error: "Impossible d envoyer votre message pour le moment.",
          code: "contact_insert_failed",
        },
        { status: 500 },
      )
    }

    await sendContactFormNotificationEmail({
      email: values.email,
      subject: sanitizeText(values.subject, 200),
      message: sanitizeText(values.message, 5000),
    }).catch((err) => console.error("Erreur envoi email notification contact", err))

    return NextResponse.json(
      {
        message: "contact_message_created",
        messageId: (data as { id_message: string }).id_message,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erreur inattendue endpoint contact", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
