import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  persistTranslationsAsPerLocaleRows,
  persistTranslationsForRow,
} from "@/lib/translation/persistTranslations"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const BACKFILL_TARGETS = [
  "products",
  "categories",
  "carousel",
  "static-pages",
  "editorial",
  "all",
] as const

const BACKFILL_REQUEST_SCHEMA = z.object({
  target: z.enum(BACKFILL_TARGETS).default("all"),
  forceRetranslate: z.boolean().optional().default(false),
})

type BackfillStat = {
  table: string
  total: number
  translated: number
  skipped: number
  failed: number
}

async function backfillProducts(forceRetranslate: boolean): Promise<BackfillStat> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("produit")
    .select(
      "id_produit, nom, description, caracteristique_tech, source_locale, traductions",
    )

  if (error || !data) {
    return { table: "produit", total: 0, translated: 0, skipped: 0, failed: 0 }
  }

  const stats: BackfillStat = {
    table: "produit",
    total: data.length,
    translated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const rawRow of data) {
    const row = rawRow as {
      id_produit: string
      nom: string
      description: string | null
      caracteristique_tech: Record<string, unknown> | null
      source_locale: string | null
      traductions: Record<string, unknown> | null
    }

    const hasTranslations =
      row.traductions && Object.keys(row.traductions).length > 0
    if (hasTranslations && !forceRetranslate) {
      stats.skipped += 1
      continue
    }

    const result = await persistTranslationsForRow({
      table: "produit",
      idColumn: "id_produit",
      idValue: row.id_produit,
      context: "product",
      fields: [
        { key: "nom", value: row.nom, format: "plain" },
        {
          key: "description",
          value: row.description ?? null,
          format: "plain",
        },
        {
          key: "caracteristique_tech",
          value:
            (row.caracteristique_tech as Record<string, string> | null) ?? null,
          format: "key-value-map",
        },
      ],
    })

    if (result) {
      stats.translated += 1
    } else {
      stats.failed += 1
    }
  }

  return stats
}

async function backfillCategories(
  forceRetranslate: boolean,
): Promise<BackfillStat> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("categorie")
    .select("id_categorie, nom, description, source_locale, traductions")

  if (error || !data) {
    return { table: "categorie", total: 0, translated: 0, skipped: 0, failed: 0 }
  }

  const stats: BackfillStat = {
    table: "categorie",
    total: data.length,
    translated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const rawRow of data) {
    const row = rawRow as {
      id_categorie: string
      nom: string
      description: string | null
      source_locale: string | null
      traductions: Record<string, unknown> | null
    }

    const hasTranslations =
      row.traductions && Object.keys(row.traductions).length > 0
    if (hasTranslations && !forceRetranslate) {
      stats.skipped += 1
      continue
    }

    const result = await persistTranslationsForRow({
      table: "categorie",
      idColumn: "id_categorie",
      idValue: row.id_categorie,
      context: "category",
      fields: [
        { key: "nom", value: row.nom, format: "plain" },
        {
          key: "description",
          value: row.description ?? null,
          format: "plain",
        },
      ],
    })

    if (result) {
      stats.translated += 1
    } else {
      stats.failed += 1
    }
  }

  return stats
}

async function backfillCarousel(
  forceRetranslate: boolean,
): Promise<BackfillStat> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("carrousel")
    .select("id_slide, titre, texte, source_locale, traductions")

  if (error || !data) {
    return { table: "carrousel", total: 0, translated: 0, skipped: 0, failed: 0 }
  }

  const stats: BackfillStat = {
    table: "carrousel",
    total: data.length,
    translated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const rawRow of data) {
    const row = rawRow as {
      id_slide: string
      titre: string
      texte: string | null
      source_locale: string | null
      traductions: Record<string, unknown> | null
    }

    const hasTranslations =
      row.traductions && Object.keys(row.traductions).length > 0
    if (hasTranslations && !forceRetranslate) {
      stats.skipped += 1
      continue
    }

    const result = await persistTranslationsForRow({
      table: "carrousel",
      idColumn: "id_slide",
      idValue: row.id_slide,
      context: "carousel-slide",
      fields: [
        { key: "titre", value: row.titre, format: "plain" },
        { key: "texte", value: row.texte ?? null, format: "plain" },
      ],
    })

    if (result) {
      stats.translated += 1
    } else {
      stats.failed += 1
    }
  }

  return stats
}

async function backfillStaticPages(
  forceRetranslate: boolean,
): Promise<BackfillStat> {
  const supabase = createAdminClient()
  const { data, error } = await (
    supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => Promise<{
          data: unknown[] | null
          error: unknown
        }>
      }
    }
  )
    .from("page_statique")
    .select("slug, locale, titre, description, contenu_markdown")

  if (error || !data) {
    return {
      table: "page_statique",
      total: 0,
      translated: 0,
      skipped: 0,
      failed: 0,
    }
  }

  const rows = data as {
    slug: string
    locale: string
    titre: string
    description: string | null
    contenu_markdown: string
  }[]

  const slugMap = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = slugMap.get(row.slug) ?? []
    list.push(row)
    slugMap.set(row.slug, list)
  }

  const stats: BackfillStat = {
    table: "page_statique",
    total: slugMap.size,
    translated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const [slug, slugRows] of slugMap.entries()) {
    if (slugRows.length >= 4 && !forceRetranslate) {
      stats.skipped += 1
      continue
    }

    const sourceRow = slugRows.find((r) => r.locale === "fr") ?? slugRows[0]
    if (!sourceRow) {
      stats.failed += 1
      continue
    }

    const result = await persistTranslationsAsPerLocaleRows({
      table: "page_statique",
      slug,
      context: "page",
      fields: [
        { key: "titre", value: sourceRow.titre, format: "plain" },
        {
          key: "description",
          value: sourceRow.description ?? null,
          format: "plain",
        },
        {
          key: "contenu_markdown",
          value: sourceRow.contenu_markdown,
          format: "markdown",
        },
      ],
      fieldKeysToColumns: {
        titre: "titre",
        description: "description",
        contenu_markdown: "contenu_markdown",
      },
    })

    if (result) {
      stats.translated += 1
    } else {
      stats.failed += 1
    }
  }

  return stats
}

async function backfillEditorial(
  forceRetranslate: boolean,
): Promise<BackfillStat> {
  const supabase = createAdminClient()
  const { data, error } = await (
    supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => Promise<{
          data: unknown[] | null
          error: unknown
        }>
      }
    }
  )
    .from("contenu_editorial")
    .select("slug, locale, titre, contenu_markdown, actif")

  if (error || !data) {
    return {
      table: "contenu_editorial",
      total: 0,
      translated: 0,
      skipped: 0,
      failed: 0,
    }
  }

  const rows = data as {
    slug: string
    locale: string
    titre: string | null
    contenu_markdown: string
    actif: boolean | null
  }[]

  const slugMap = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = slugMap.get(row.slug) ?? []
    list.push(row)
    slugMap.set(row.slug, list)
  }

  const stats: BackfillStat = {
    table: "contenu_editorial",
    total: slugMap.size,
    translated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const [slug, slugRows] of slugMap.entries()) {
    if (slugRows.length >= 4 && !forceRetranslate) {
      stats.skipped += 1
      continue
    }

    const sourceRow = slugRows.find((r) => r.locale === "fr") ?? slugRows[0]
    if (!sourceRow) {
      stats.failed += 1
      continue
    }

    const result = await persistTranslationsAsPerLocaleRows({
      table: "contenu_editorial",
      slug,
      context: "editorial",
      fields: [
        { key: "titre", value: sourceRow.titre, format: "plain" },
        {
          key: "contenu_markdown",
          value: sourceRow.contenu_markdown,
          format: "markdown",
        },
      ],
      fieldKeysToColumns: {
        titre: "titre",
        contenu_markdown: "contenu_markdown",
      },
      extraColumns: { actif: sourceRow.actif ?? false },
    })

    if (result) {
      stats.translated += 1
    } else {
      stats.failed += 1
    }
  }

  return stats
}

export async function POST(request: NextRequest) {
  const denied = await verifyAdminAccess()
  if (denied) {
    return denied
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const parsed = BACKFILL_REQUEST_SCHEMA.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parametres invalides.", details: parsed.error.format() },
      { status: 400 },
    )
  }

  const { target, forceRetranslate } = parsed.data

  const stats: BackfillStat[] = []

  if (target === "products" || target === "all") {
    stats.push(await backfillProducts(forceRetranslate))
  }
  if (target === "categories" || target === "all") {
    stats.push(await backfillCategories(forceRetranslate))
  }
  if (target === "carousel" || target === "all") {
    stats.push(await backfillCarousel(forceRetranslate))
  }
  if (target === "static-pages" || target === "all") {
    stats.push(await backfillStaticPages(forceRetranslate))
  }
  if (target === "editorial" || target === "all") {
    stats.push(await backfillEditorial(forceRetranslate))
  }

  return NextResponse.json({ target, forceRetranslate, stats })
}
