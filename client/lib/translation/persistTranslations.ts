import { createAdminClient } from "@/lib/supabase/admin"
import { type AppLocale } from "@/lib/i18n"
import {
  translateContent,
  type TranslatableField,
  type TranslationContext,
  type TranslationResult,
} from "@/lib/translation/translateContent"

type PersistTranslationsArgs = {
  table: "produit" | "categorie" | "carrousel"
  idColumn: string
  idValue: string
  context: TranslationContext
  fields: TranslatableField[]
}

export async function persistTranslationsForRow(
  args: PersistTranslationsArgs,
): Promise<TranslationResult | null> {
  try {
    const result = await translateContent({
      context: args.context,
      fields: args.fields,
    })

    const supabase = createAdminClient()
    const { error } = await supabase
      .from(args.table)
      .update({
        source_locale: result.detectedSourceLocale,
        traductions: result.translations,
      } as never)
      .eq(args.idColumn, args.idValue)

    if (error) {
      console.error("Erreur enregistrement traductions", {
        table: args.table,
        idValue: args.idValue,
        error,
      })
      return null
    }

    return result
  } catch (error) {
    console.error("Echec auto-traduction (non-bloquant)", {
      table: args.table,
      idValue: args.idValue,
      context: args.context,
      error,
    })
    return null
  }
}

type PersistPerLocaleRowArgs = {
  table: "page_statique" | "contenu_editorial"
  slug: string
  context: TranslationContext
  fields: TranslatableField[]
  fieldKeysToColumns: Record<string, string>
  extraColumns?: Record<string, unknown>
}

export async function persistTranslationsAsPerLocaleRows(
  args: PersistPerLocaleRowArgs,
): Promise<TranslationResult | null> {
  try {
    const result = await translateContent({
      context: args.context,
      fields: args.fields,
    })

    const supabase = createAdminClient()

    const rowsToUpsert: Record<string, unknown>[] = []

    for (const [locale, translatedFields] of Object.entries(
      result.translations,
    )) {
      const row: Record<string, unknown> = {
        slug: args.slug,
        locale: locale as AppLocale,
        ...(args.extraColumns ?? {}),
        date_mise_a_jour: new Date().toISOString(),
      }

      for (const [fieldKey, columnName] of Object.entries(
        args.fieldKeysToColumns,
      )) {
        const translatedValue = translatedFields[fieldKey]
        if (translatedValue !== undefined) {
          row[columnName] = translatedValue
        }
      }

      rowsToUpsert.push(row)
    }

    if (rowsToUpsert.length > 0) {
      const { error } = await supabase
        .from(args.table)
        .upsert(rowsToUpsert as never, { onConflict: "slug,locale" })

      if (error) {
        console.error("Erreur upsert traductions per-locale", {
          table: args.table,
          slug: args.slug,
          error,
        })
        return null
      }
    }

    return result
  } catch (error) {
    console.error("Echec auto-traduction per-locale (non-bloquant)", {
      table: args.table,
      slug: args.slug,
      error,
    })
    return null
  }
}
