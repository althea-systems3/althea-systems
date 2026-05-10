import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { locales } from "@/lib/i18n"
import {
  translateContent,
  type TranslationContext,
} from "@/lib/translation/translateContent"

export const maxDuration = 300

const TRANSLATION_CONTEXTS = [
  "product",
  "category",
  "page",
  "editorial",
  "carousel-slide",
] as const satisfies readonly TranslationContext[]

const FIELD_VALUE_SCHEMA = z.union([
  z.string(),
  z.record(z.string(), z.string()),
  z.null(),
])

const TRANSLATE_REQUEST_SCHEMA = z.object({
  context: z.enum(TRANSLATION_CONTEXTS),
  fields: z
    .array(
      z.object({
        key: z.string().min(1),
        value: FIELD_VALUE_SCHEMA,
        format: z.enum(["plain", "markdown", "key-value-map"]).optional(),
      }),
    )
    .min(1)
    .max(20),
  targetLocales: z.array(z.enum(locales)).optional(),
})

export async function POST(request: NextRequest) {
  const denied = await verifyAdminAccess()
  if (denied) {
    return denied
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Corps JSON invalide." },
      { status: 400 },
    )
  }

  const parsed = TRANSLATE_REQUEST_SCHEMA.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parametres invalides.", details: parsed.error.format() },
      { status: 400 },
    )
  }

  try {
    const result = await translateContent(parsed.data)

    return NextResponse.json({
      detectedSourceLocale: result.detectedSourceLocale,
      translations: result.translations,
    })
  } catch (error) {
    console.error("Erreur traduction admin", { error })
    return NextResponse.json(
      { error: "La traduction a echoue. Reessayez." },
      { status: 502 },
    )
  }
}
