import { unstable_cache } from "next/cache"

import { type AppLocale, toAppLocale } from "@/lib/i18n"
import {
  SUPABASE_ADMIN_ENV_KEYS,
  logMissingRuntimeConfig,
  validateRuntimeConfig,
} from "@/lib/config/runtime"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStaticPageFallbackContent } from "@/lib/static-pages/fallbackContent"
import {
  type StaticPageContentPayload,
  type StaticPageSlug,
} from "@/lib/static-pages/staticPages"

export const STATIC_PAGE_REVALIDATE_SECONDS = 300

type StaticPageRow = {
  slug: string
  locale: string
  titre: string
  description: string | null
  contenu_markdown: string
  date_mise_a_jour: string | null
}

function createFallbackPayload(
  slug: StaticPageSlug,
  locale: AppLocale,
): StaticPageContentPayload {
  const fallback = getStaticPageFallbackContent({ slug, locale })

  return {
    slug,
    locale,
    title: fallback.title,
    description: fallback.description,
    contentMarkdown: fallback.markdown,
    updatedAt: null,
    isFallbackData: true,
  }
}

async function fetchStaticPageRowFromDatabase(
  slug: StaticPageSlug,
  locale: AppLocale,
): Promise<StaticPageRow | null> {
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
    throw new Error(
      `Erreur lecture page statique ${slug}/${locale}: ${error.message}`,
    )
  }

  return (data as StaticPageRow | null) ?? null
}

const fetchStaticPageRowCached = unstable_cache(
  fetchStaticPageRowFromDatabase,
  ["public-static-pages-content"],
  {
    revalidate: STATIC_PAGE_REVALIDATE_SECONDS,
  },
)

async function fetchStaticPageRow(
  slug: StaticPageSlug,
  locale: AppLocale,
): Promise<StaticPageRow | null> {
  if (process.env.NODE_ENV === "test") {
    return fetchStaticPageRowFromDatabase(slug, locale)
  }

  return fetchStaticPageRowCached(slug, locale)
}

export async function getPublicStaticPageContent(params: {
  slug: StaticPageSlug
  localeInput: string | null | undefined
}): Promise<StaticPageContentPayload> {
  const locale = toAppLocale(params.localeInput)

  const configValidation = validateRuntimeConfig(SUPABASE_ADMIN_ENV_KEYS)

  if (!configValidation.isValid) {
    logMissingRuntimeConfig(
      "static-pages.public-content",
      configValidation.missingKeys,
    )
    return createFallbackPayload(params.slug, locale)
  }

  try {
    const row = await fetchStaticPageRow(params.slug, locale)

    if (!row) {
      return createFallbackPayload(params.slug, locale)
    }

    return {
      slug: params.slug,
      locale,
      title: row.titre,
      description: row.description,
      contentMarkdown: row.contenu_markdown,
      updatedAt: row.date_mise_a_jour,
      isFallbackData: false,
    }
  } catch (error) {
    console.error("Erreur chargement contenu public page statique", {
      slug: params.slug,
      locale,
      error,
    })

    return createFallbackPayload(params.slug, locale)
  }
}
