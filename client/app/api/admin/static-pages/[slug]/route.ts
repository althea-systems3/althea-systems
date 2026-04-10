import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { toAppLocale } from "@/lib/i18n"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  isStaticPageSlug,
  STATIC_PAGE_DEFAULTS,
} from "@/lib/static-pages/staticPages"

type RouteContext = {
  params: Promise<{ slug: string }>
}

type StaticPageRow = {
  slug: string
  locale: string
  titre: string
  description: string | null
  contenu_markdown: string
  date_mise_a_jour: string | null
}

type AdminStaticPageUpdateBody = {
  locale?: string
  title?: string
  description?: string | null
  contentMarkdown?: string
}

type UntypedStaticPageClient = {
  from: (tableName: string) => {
    upsert: (
      values: {
        slug: string
        locale: string
        titre: string
        description: string | null
        contenu_markdown: string
        date_mise_a_jour: string
      },
      options: { onConflict: string },
    ) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: StaticPageRow | null
          error: { message?: string } | null
        }>
      }
    }
  }
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  const { slug } = await params

  if (!isStaticPageSlug(slug)) {
    return NextResponse.json(
      { error: "Page statique introuvable." },
      { status: 404 },
    )
  }

  const locale = toAppLocale(request.nextUrl.searchParams.get("locale"))

  try {
    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin
      .from("page_statique")
      .select(
        "slug, locale, titre, description, contenu_markdown, date_mise_a_jour",
      )
      .eq("slug", slug)
      .eq("locale", locale)
      .maybeSingle()

    if (error) {
      console.error("Erreur lecture page statique admin", {
        slug,
        locale,
        error,
      })

      return NextResponse.json(
        { error: "Impossible de charger la page statique." },
        { status: 500 },
      )
    }

    const row = (data as StaticPageRow | null) ?? null

    if (!row) {
      const defaults = STATIC_PAGE_DEFAULTS[slug]

      return NextResponse.json({
        slug,
        locale,
        title: defaults.title,
        description: defaults.description,
        contentMarkdown: "",
        updatedAt: null,
        isFallbackData: true,
      })
    }

    return NextResponse.json({
      slug,
      locale,
      title: row.titre,
      description: row.description,
      contentMarkdown: row.contenu_markdown,
      updatedAt: row.date_mise_a_jour,
      isFallbackData: false,
    })
  } catch (error) {
    console.error("Erreur inattendue page statique admin", {
      slug,
      locale,
      error,
    })

    return NextResponse.json(
      { error: "Impossible de charger la page statique." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  const { slug } = await params

  if (!isStaticPageSlug(slug)) {
    return NextResponse.json(
      { error: "Page statique introuvable." },
      { status: 404 },
    )
  }

  const body = (await request
    .json()
    .catch(() => null)) as AdminStaticPageUpdateBody | null

  const locale = toAppLocale(body?.locale)
  const title = normalizeString(body?.title)
  const descriptionRaw = normalizeString(body?.description)
  const contentMarkdown = normalizeString(body?.contentMarkdown)

  if (!title) {
    return NextResponse.json(
      { error: "Le titre est obligatoire." },
      { status: 400 },
    )
  }

  if (!contentMarkdown) {
    return NextResponse.json(
      { error: "Le contenu editorial est obligatoire." },
      { status: 400 },
    )
  }

  const description = descriptionRaw || null

  try {
    const supabaseAdmin = createAdminClient()

    const payload = {
      slug,
      locale,
      titre: title,
      description,
      contenu_markdown: contentMarkdown,
      date_mise_a_jour: new Date().toISOString(),
    }

    const staticPageClient = supabaseAdmin as unknown as UntypedStaticPageClient

    const { data, error } = await staticPageClient
      .from("page_statique")
      .upsert(payload, {
        onConflict: "slug,locale",
      })
      .select(
        "slug, locale, titre, description, contenu_markdown, date_mise_a_jour",
      )
      .single()

    if (error || !data) {
      console.error("Erreur mise a jour page statique admin", {
        slug,
        locale,
        error,
      })

      return NextResponse.json(
        { error: "Impossible d'enregistrer la page statique." },
        { status: 500 },
      )
    }

    const row = data as StaticPageRow

    return NextResponse.json({
      slug: row.slug,
      locale: row.locale,
      title: row.titre,
      description: row.description,
      contentMarkdown: row.contenu_markdown,
      updatedAt: row.date_mise_a_jour,
      isFallbackData: false,
    })
  } catch (error) {
    console.error("Erreur inattendue mise a jour page statique admin", {
      slug,
      locale,
      error,
    })

    return NextResponse.json(
      { error: "Impossible d'enregistrer la page statique." },
      { status: 500 },
    )
  }
}
