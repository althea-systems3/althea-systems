import { getLocale } from "next-intl/server"

import { EditorialContentRenderer } from "@/components/editorial/EditorialContentRenderer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getPublicStaticPageContent } from "@/lib/static-pages/publicContent"
import { type StaticPageSlug } from "@/lib/static-pages/staticPages"

type PublicStaticPageProps = {
  slug: StaticPageSlug
  fallbackTitle: string
  fallbackDescription: string
}

type StaticPageStatusText = {
  empty: string
}

const STATUS_TEXT_BY_LOCALE: Record<string, StaticPageStatusText> = {
  fr: {
    empty: "Cette page ne contient pas encore de contenu publié.",
  },
  en: {
    empty: "This page does not contain any published content yet.",
  },
  es: {
    empty: "Esta pagina aun no contiene contenido publicado.",
  },
  ar: {
    empty: "This page does not contain any published content yet.",
  },
}

export async function PublicStaticPage({
  slug,
  fallbackTitle,
  fallbackDescription,
}: PublicStaticPageProps) {
  const locale = await getLocale()

  const statusText = STATUS_TEXT_BY_LOCALE[locale] ?? STATUS_TEXT_BY_LOCALE.fr

  const contentPayload = await getPublicStaticPageContent({
    slug,
    localeInput: locale,
  })

  const pageTitle = contentPayload.title.trim() || fallbackTitle
  const pageDescription =
    contentPayload.description?.trim() || fallbackDescription
  const hasEditorialContent = contentPayload.contentMarkdown.trim().length > 0

  return (
    <section className="container py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
        <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#f0fbfc] via-white to-[#eaf3fb] p-6 sm:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            aria-hidden="true"
            style={{
              backgroundImage:
                "radial-gradient(circle at 95% 10%, rgba(20,184,200,0.18) 0, transparent 50%), radial-gradient(circle at 5% 90%, rgba(28,78,128,0.12) 0, transparent 50%)",
            }}
          />
          <div className="relative space-y-3">
            <Badge
              variant="secondary"
              className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-cta backdrop-blur hover:bg-white/90"
            >
              Althea Systems
            </Badge>
            <h1 className="heading-font text-3xl leading-tight tracking-tight text-brand-nav sm:text-4xl lg:text-5xl">
              {pageTitle}
            </h1>
            <p className="max-w-2xl text-sm text-slate-700 sm:text-base">
              {pageDescription}
            </p>
          </div>
        </header>

        {!hasEditorialContent ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-slate-700 sm:text-base">
                {statusText.empty}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {hasEditorialContent ? (
          <Card className="border-border/80">
            <CardContent className="pt-6">
              <EditorialContentRenderer
                markdown={contentPayload.contentMarkdown}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
