import { GoogleGenAI } from "@google/genai"
import { z } from "zod"

import { isAppLocale, locales, type AppLocale } from "@/lib/i18n"

const TRANSLATION_MODEL =
  process.env.GEMINI_TRANSLATION_MODEL ?? "gemini-2.0-flash"

const TRANSLATION_TIMEOUT_MS = 300_000

export type TranslationContext =
  | "product"
  | "category"
  | "page"
  | "editorial"
  | "carousel-slide"

export type TranslatableFieldValue = string | Record<string, string> | null

export type TranslatableField = {
  key: string
  value: TranslatableFieldValue
  format?: "plain" | "markdown" | "key-value-map"
}

export type TranslationRequest = {
  context: TranslationContext
  fields: TranslatableField[]
  targetLocales?: AppLocale[]
}

export type TranslationResult = {
  detectedSourceLocale: AppLocale
  translations: Record<string, Record<string, TranslatableFieldValue>>
}

export class TranslationRateLimitError extends Error {
  retryAfterSeconds: number | null
  constructor(retryAfterSeconds: number | null, message?: string) {
    super(
      message ??
        `Quota Gemini atteint. Reessayez dans ${retryAfterSeconds ?? "?"}s.`,
    )
    this.name = "TranslationRateLimitError"
    this.retryAfterSeconds = retryAfterSeconds
  }
}

let cachedClient: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!cachedClient) {
    const apiKey =
      process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? null
    if (!apiKey) {
      throw new Error(
        "Variable d'environnement GEMINI_API_KEY (ou GOOGLE_AI_API_KEY) manquante.",
      )
    }
    cachedClient = new GoogleGenAI({ apiKey })
  }
  return cachedClient
}

const TRANSLATION_RESPONSE_SCHEMA = z.object({
  detected_source_locale: z.enum(locales),
  translations: z.record(
    z.string(),
    z.record(
      z.string(),
      z.union([z.string(), z.record(z.string(), z.string())]),
    ),
  ),
})

const CONTEXT_HINTS: Record<TranslationContext, string> = {
  product:
    "Tu traduis une fiche produit B2B medical. Garde les marques, references et numeros de modele tels quels (ex: 'MedPro', 'CE Classe IIa'). Conserve les unites (kg, mm, lux, bpm, %). Si une caracteristique technique est une cle/valeur, traduis les deux mais garde les valeurs numeriques inchangees.",
  category:
    "Tu traduis le nom et la description d'une categorie de produits B2B medicaux. Reste concis et professionnel.",
  page: "Tu traduis une page editoriale (CGU, mentions legales, a propos). Conserve la structure markdown (titres ##, gras **, italique *, liens [texte](url)). Ne traduis PAS les URLs (les liens internes restent identiques).",
  editorial:
    "Tu traduis un bloc editorial (texte d'accueil ou notice). Conserve la structure markdown.",
  "carousel-slide":
    "Tu traduis un slide de carrousel marketing. Reste tres court et accrocheur, comme l'original.",
}

const LOCALE_NAMES: Record<AppLocale, string> = {
  fr: "francais",
  en: "anglais",
  es: "espagnol",
  ar: "arabe",
}

function buildSystemPrompt(context: TranslationContext): string {
  return [
    "Tu es un traducteur professionnel pour un e-commerce B2B medical.",
    CONTEXT_HINTS[context],
    "Detecte automatiquement la langue source du contenu fourni.",
    "Reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans markdown, sans explications.",
    "Format strict :",
    '{ "detected_source_locale": "<fr|en|es|ar>", "translations": { "<locale>": { "<champ>": <valeur traduite> } } }',
    "Pour chaque champ : si la valeur source est une string, la valeur traduite est une string. Si la valeur source est un objet cle/valeur, la valeur traduite est aussi un objet cle/valeur (traduis les deux).",
    "Si un champ source est null ou vide, ne le retraduis pas (omets-le des translations).",
    "N'inclus PAS la langue source dans translations (uniquement les langues cibles).",
  ].join(" ")
}

function buildUserPrompt(
  fields: TranslatableField[],
  targetLocales: AppLocale[],
): string {
  const targetLocaleList = targetLocales
    .map((locale) => `${locale} (${LOCALE_NAMES[locale]})`)
    .join(", ")

  const fieldsPayload = fields.reduce<
    Record<string, TranslatableFieldValue>
  >((acc, field) => {
    acc[field.key] = field.value
    return acc
  }, {})

  return [
    "Champs a traduire (format JSON) :",
    JSON.stringify(fieldsPayload, null, 2),
    "",
    `Langues cibles : ${targetLocaleList}.`,
    "Retourne un JSON avec detected_source_locale et translations[locale][champ].",
  ].join("\n")
}

function isRateLimitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false

  const errObj = error as {
    status?: number
    statusCode?: number
    code?: number | string
    message?: string
  }

  if (errObj.status === 429 || errObj.statusCode === 429) return true
  if (errObj.code === 429 || errObj.code === "429") return true

  const msg = (errObj.message ?? "").toLowerCase()
  return (
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("too many requests")
  )
}

function extractRetryAfterSeconds(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null

  const errObj = error as {
    headers?: { get?: (key: string) => string | null }
    message?: string
  }

  const headerValue = errObj.headers?.get?.("retry-after")
  if (headerValue) {
    const parsed = Number(headerValue)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  const msgMatch = errObj.message?.match(/retry.{0,15}?(\d+)\s*(s|sec|second|seconds)/i)
  if (msgMatch) {
    const parsed = Number(msgMatch[1])
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return null
}

export async function translateContent(
  request: TranslationRequest,
): Promise<TranslationResult> {
  const trimmedFields = request.fields.filter((field) => {
    if (field.value === null) return false
    if (typeof field.value === "string") return field.value.trim().length > 0
    return Object.keys(field.value).length > 0
  })

  if (trimmedFields.length === 0) {
    return {
      detectedSourceLocale: "fr",
      translations: {},
    }
  }

  const targetLocales =
    request.targetLocales && request.targetLocales.length > 0
      ? request.targetLocales
      : Array.from(locales)

  const client = getClient()
  const systemPrompt = buildSystemPrompt(request.context)
  const userPrompt = buildUserPrompt(trimmedFields, targetLocales)

  let rawContent: string
  try {
    const response = await Promise.race([
      client.models.generateContent({
        model: TRANSLATION_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Translation request timed out")),
          TRANSLATION_TIMEOUT_MS,
        )
      }),
    ])

    rawContent = response.text ?? ""
  } catch (error) {
    if (isRateLimitError(error)) {
      throw new TranslationRateLimitError(extractRetryAfterSeconds(error))
    }
    throw error
  }

  if (!rawContent) {
    throw new Error("Reponse Gemini vide.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    throw new Error("Reponse Gemini non-JSON.")
  }

  const validated = TRANSLATION_RESPONSE_SCHEMA.safeParse(parsed)
  if (!validated.success) {
    throw new Error("Reponse Gemini au mauvais format.")
  }

  const detectedSource = validated.data.detected_source_locale
  const allowedTargets = new Set<string>(
    targetLocales.filter((locale) => locale !== detectedSource),
  )
  const filteredTranslations: TranslationResult["translations"] = {}

  for (const [locale, fieldsMap] of Object.entries(
    validated.data.translations,
  )) {
    if (!isAppLocale(locale)) continue
    if (!allowedTargets.has(locale)) continue
    filteredTranslations[locale] = fieldsMap
  }

  return {
    detectedSourceLocale: detectedSource,
    translations: filteredTranslations,
  }
}

export function getTargetLocalesForSource(
  sourceLocale: AppLocale,
): AppLocale[] {
  return locales.filter((locale) => locale !== sourceLocale)
}
