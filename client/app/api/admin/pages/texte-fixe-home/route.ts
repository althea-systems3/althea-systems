import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { toAppLocale } from "@/lib/i18n"
import {
  HOME_FIXED_TEXT_SLUG,
  createEmptyHomeFixedTextPayload,
} from "@/lib/home-fixed-text/homeFixedText"
import { createAdminClient } from "@/lib/supabase/admin"

type HomeFixedTextRow = {
  slug: string
  locale: string
  titre: string | null
  contenu_markdown: string | null
  date_mise_a_jour: string | null
}

type AdminHomeFixedTextBody = {
  locale?: string
  title?: string | null
  contentMarkdown?: string
}

type UntypedEditorialClient = {
  from: (tableName: string) => {
    upsert: (
      values: {
        slug: string
        locale: string
        titre: string | null
        contenu_markdown: string
        date_mise_a_jour: string
      },
      options: { onConflict: string },
    ) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: HomeFixedTextRow | null
          error: { message?: string } | null
        }>
      }
    }
  }
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmedValue = value.trim()

  return trimmedValue || null
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  const locale = toAppLocale(request.nextUrl.searchParams.get("locale"))

  try {
    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin
      .from("contenu_editorial")
      .select("slug, locale, titre, contenu_markdown, date_mise_a_jour")
      .eq("slug", HOME_FIXED_TEXT_SLUG)
      .eq("locale", locale)
      .maybeSingle()

    if (error) {
      console.error("Erreur lecture texte fixe home admin", {
        locale,
        error,
      })

      return NextResponse.json(
        { error: "Impossible de charger le contenu editorial home." },
        { status: 500 },
      )
    }

    const row = (data as HomeFixedTextRow | null) ?? null

    if (!row) {
      return NextResponse.json(createEmptyHomeFixedTextPayload(locale))
    }

    return NextResponse.json({
      slug: HOME_FIXED_TEXT_SLUG,
      locale,
      title: row.titre,
      contentMarkdown: row.contenu_markdown ?? "",
      updatedAt: row.date_mise_a_jour,
      isFallbackData: false,
    })
  } catch (error) {
    console.error("Erreur inattendue lecture texte fixe home admin", {
      locale,
      error,
    })

    return NextResponse.json(
      { error: "Impossible de charger le contenu editorial home." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  const body = (await request
    .json()
    .catch(() => null)) as AdminHomeFixedTextBody | null

  const locale = toAppLocale(body?.locale)
  const title = normalizeNullableString(body?.title)
  const contentMarkdown = normalizeString(body?.contentMarkdown)

  try {
    const supabaseAdmin = createAdminClient()

    const payload = {
      slug: HOME_FIXED_TEXT_SLUG,
      locale,
      titre: title,
      contenu_markdown: contentMarkdown,
      date_mise_a_jour: new Date().toISOString(),
    }

    const editorialClient = supabaseAdmin as unknown as UntypedEditorialClient

    const { data, error } = await editorialClient
      .from("contenu_editorial")
      .upsert(payload, {
        onConflict: "slug,locale",
      })
      .select("slug, locale, titre, contenu_markdown, date_mise_a_jour")
      .single()

    if (error || !data) {
      console.error("Erreur sauvegarde texte fixe home admin", {
        locale,
        error,
      })

      return NextResponse.json(
        { error: "Impossible d'enregistrer le contenu editorial home." },
        { status: 500 },
      )
    }

    return NextResponse.json({
      slug: HOME_FIXED_TEXT_SLUG,
      locale: data.locale,
      title: data.titre,
      contentMarkdown: data.contenu_markdown ?? "",
      updatedAt: data.date_mise_a_jour,
      isFallbackData: false,
    })
  } catch (error) {
    console.error("Erreur inattendue sauvegarde texte fixe home admin", {
      locale,
      error,
    })

    return NextResponse.json(
      { error: "Impossible d'enregistrer le contenu editorial home." },
      { status: 500 },
    )
  }
}
