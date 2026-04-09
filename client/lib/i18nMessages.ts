import { defaultLocale, type AppLocale } from "@/lib/i18n"

type MessageLeaf = string | number | boolean | null
type MessageValue = MessageLeaf | MessageObject | MessageValue[]

interface MessageObject {
  [key: string]: MessageValue
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeMessageObjects(
  baseMessages: MessageObject,
  overrideMessages: MessageObject,
): MessageObject {
  const mergedMessages: MessageObject = { ...baseMessages }

  for (const [messageKey, overrideValue] of Object.entries(overrideMessages)) {
    const baseValue = mergedMessages[messageKey]

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      mergedMessages[messageKey] = mergeMessageObjects(
        baseValue as MessageObject,
        overrideValue as MessageObject,
      )
      continue
    }

    mergedMessages[messageKey] = overrideValue as MessageValue
  }

  return mergedMessages
}

async function loadLocaleMessages(locale: AppLocale): Promise<MessageObject> {
  const localeModule = (await import(`../messages/${locale}.json`)) as {
    default: MessageObject
  }

  return localeModule.default
}

function getFallbackLocales(locale: AppLocale): AppLocale[] {
  if (locale === defaultLocale) {
    return []
  }

  const fallbackLocales: AppLocale[] = [defaultLocale]

  if ((locale === "ar" || locale === "es") && !fallbackLocales.includes("en")) {
    fallbackLocales.push("en")
  }

  return fallbackLocales
}

export async function loadMessagesWithFallback(
  locale: AppLocale,
): Promise<MessageObject> {
  const fallbackLocales = getFallbackLocales(locale)
  const [fallbackMessages, localeMessages] = await Promise.all([
    Promise.all(
      fallbackLocales.map((fallbackLocale) =>
        loadLocaleMessages(fallbackLocale),
      ),
    ),
    loadLocaleMessages(locale),
  ])

  const mergedFallbackMessages = fallbackMessages.reduce<MessageObject>(
    (currentMessages, nextMessages) =>
      mergeMessageObjects(currentMessages, nextMessages),
    {},
  )

  return mergeMessageObjects(mergedFallbackMessages, localeMessages)
}

export { mergeMessageObjects }
