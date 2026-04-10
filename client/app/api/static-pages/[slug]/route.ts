import { NextRequest, NextResponse } from "next/server"

import { toAppLocale } from "@/lib/i18n"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStaticPageFallbackContent } from "@/lib/static-pages/fallbackContent"
import {
  isStaticPageSlug,
  type StaticPageContentPayload,
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

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  if (!isStaticPageSlug(slug)) {
    return NextResponse.json(
      { error: "Page statique introuvable." },
      { status: 404 },
    )
  }

  const locale = toAppLocale(request.nextUrl.searchParams.get("locale"))

  if (!hasRequiredConfig()) {
    const fallback = getStaticPageFallbackContent({ slug, locale })

    const fallbackPayload: StaticPageContentPayload = {
      slug,
      locale,
      title: fallback.title,
      description: fallback.description,
      contentMarkdown: fallback.markdown,
      updatedAt: null,
      isFallbackData: true,
    }

    return NextResponse.json(fallbackPayload)
  }

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
      console.error("Erreur lecture page statique", { slug, locale, error })

      const fallback = getStaticPageFallbackContent({ slug, locale })

      const fallbackPayload: StaticPageContentPayload = {
        slug,
        locale,
        title: fallback.title,
        description: fallback.description,
        contentMarkdown: fallback.markdown,
        updatedAt: null,
        isFallbackData: true,
      }

      return NextResponse.json(fallbackPayload)
    }

    const row = (data as StaticPageRow | null) ?? null

    if (!row) {
      const fallback = getStaticPageFallbackContent({ slug, locale })

      const fallbackPayload: StaticPageContentPayload = {
        slug,
        locale,
        title: fallback.title,
        description: fallback.description,
        contentMarkdown: fallback.markdown,
        updatedAt: null,
        isFallbackData: true,
      }

      return NextResponse.json(fallbackPayload)
    }

    const payload: StaticPageContentPayload = {
      slug,
      locale,
      title: row.titre,
      description: row.description,
      contentMarkdown: row.contenu_markdown,
      updatedAt: row.date_mise_a_jour,
      isFallbackData: false,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Erreur inattendue page statique", { slug, locale, error })

    const fallback = getStaticPageFallbackContent({ slug, locale })

    const fallbackPayload: StaticPageContentPayload = {
      slug,
      locale,
      title: fallback.title,
      description: fallback.description,
      contentMarkdown: fallback.markdown,
      updatedAt: null,
      isFallbackData: true,
    }

    return NextResponse.json(fallbackPayload)
  }
}
